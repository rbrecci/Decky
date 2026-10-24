$ErrorActionPreference = 'Stop'
$backupScript = Join-Path $PSScriptRoot '../../scripts/admin/backup-v2.ps1'
$checks = 0
function Assert($Condition, [string]$Message) {
    if (-not $Condition) { throw $Message }
    $script:checks++
}
Assert (Test-Path -LiteralPath $backupScript) 'backup-v2.ps1 ainda nao implementado'

$testRoot = Join-Path ([System.IO.Path]::GetTempPath()) ('decky-backup-test-' + [guid]::NewGuid().ToString('N'))
[void][System.IO.Directory]::CreateDirectory($testRoot)
$fakeDump = Join-Path $testRoot 'pg_dump.exe'
$marker = Join-Path $testRoot 'process.txt'
Add-Type -OutputAssembly $fakeDump -OutputType ConsoleApplication -TypeDefinition @'
using System;
using System.IO;
using System.Threading;
public class FakeDump {
    public static int Main(string[] args) {
        string mode = Environment.GetEnvironmentVariable("DECKY_FAKE_MODE");
        File.AppendAllText(Environment.GetEnvironmentVariable("DECKY_FAKE_MARKER"), string.Join("\n", args) + "\nssl=" + Environment.GetEnvironmentVariable("PGSSLMODE") + "\n");
        if (Array.IndexOf(args, "--version") >= 0) {
            Console.WriteLine(mode == "old-version" ? "pg_dump (PostgreSQL) 16.9" : "pg_dump (PostgreSQL) 17.11");
            return 0;
        }
        if (mode == "timeout") { Thread.Sleep(5000); return 0; }
        string secret = Environment.GetEnvironmentVariable("PGPASSWORD");
        Console.Error.Write(new string('x', 131072) + secret);
        Stream output = Console.OpenStandardOutput();
        if (mode == "invalid") { output.WriteByte(0); return 0; }
        byte[] bytes = new byte[262149];
        bytes[0] = 80; bytes[1] = 71; bytes[2] = 68; bytes[3] = 77; bytes[4] = 80;
        for (int i = 5; i < bytes.Length; i++) bytes[i] = (byte)((i - 5) % 256);
        output.Write(bytes, 0, bytes.Length);
        return mode == "failure" ? 9 : 0;
    }
}
'@
$variables = @('PGHOST', 'PGUSER', 'PGDATABASE', 'PGPORT', 'PGSSLMODE', 'PGPASSWORD', 'PGHOSTADDR', 'PGSERVICE', 'PGSERVICEFILE', 'DECKY_FAKE_MODE', 'DECKY_FAKE_MARKER')
$original = @{}
foreach ($name in $variables) { $original[$name] = [Environment]::GetEnvironmentVariable($name, 'Process') }
try {
    $env:PGHOST = 'db.yfijjtibyblzuplhtxbd.supabase.co'
    $env:PGUSER = 'postgres'
    $env:PGDATABASE = 'postgres'
    $env:PGPORT = '5432'
    $env:PGSSLMODE = $null
    $env:PGHOSTADDR = $null
    $env:PGSERVICE = $null
    $env:PGSERVICEFILE = $null
    $env:PGPASSWORD = 'SYNTHETIC_PASSWORD_DO_NOT_LOG_7f09'
    $env:DECKY_FAKE_MARKER = $marker
    $env:DECKY_FAKE_MODE = 'success'
    $destination = Join-Path $testRoot 'encrypted'
    $output = @(& $backupScript -PgDumpPath $fakeDump -OutputDirectory $destination)
    $dumpFiles = @(Get-ChildItem -LiteralPath $destination -Filter '*.dump.dpapi')
    Assert ($dumpFiles.Count -eq 1) 'Deve gravar um unico dump cifrado'
    $metadataFiles = @(Get-ChildItem -LiteralPath $destination -Filter '*.json')
    Assert ($metadataFiles.Count -eq 1) 'Deve gravar metadados sem segredo'
    $cipher = [System.IO.File]::ReadAllBytes($dumpFiles[0].FullName)
    Add-Type -AssemblyName System.Security
    $plain = [System.Security.Cryptography.ProtectedData]::Unprotect($cipher, $null, [System.Security.Cryptography.DataProtectionScope]::CurrentUser)
    Assert ($plain.Length -eq 262149) 'Tamanho binario deve ser preservado'
    Assert ([System.Text.Encoding]::ASCII.GetString($plain, 0, 5) -eq 'PGDMP') 'Magic deve ser preservado'
    for ($index = 5; $index -lt $plain.Length; $index++) {
        if ($plain[$index] -ne (($index - 5) % 256)) { throw 'Roundtrip alterou bytes binarios' }
    }
    $checks++
    $metadataText = [System.IO.File]::ReadAllText($metadataFiles[0].FullName)
    $metadata = $metadataText | ConvertFrom-Json
    Assert (-not (($output -join "`n") + $metadataText).Contains($env:PGPASSWORD)) 'Senha sintetica nao pode aparecer em output/metadados'
    Assert ($metadata.project -eq 'yfijjtibyblzuplhtxbd') 'Metadados devem identificar o projeto'
    Assert (($metadata.schemas -join ',') -eq 'public,private,auth,storage,supabase_migrations') 'Metadados devem identificar schemas'
    Assert ($metadata.pgDumpVersion -eq '17.11') 'Metadados devem registrar versao sanitizada'
    Assert ($metadata.protection -eq 'DPAPI CurrentUser') 'Metadados devem registrar dependencia do perfil'
    $sha = [System.Security.Cryptography.SHA256]::Create()
    try {
        $plainHash = ([BitConverter]::ToString($sha.ComputeHash($plain))).Replace('-', '').ToLowerInvariant()
        $cipherHash = ([BitConverter]::ToString($sha.ComputeHash($cipher))).Replace('-', '').ToLowerInvariant()
    } finally { $sha.Dispose() }
    Assert ($metadata.plaintextSha256 -eq $plainHash -and $metadata.ciphertextSha256 -eq $cipherHash) 'Hashes devem corresponder aos bytes reais'
    Assert ($metadata.plaintextBytes -eq $plain.Length -and $metadata.ciphertextBytes -eq $cipher.Length) 'Tamanhos devem corresponder aos bytes reais'
    Assert ($metadata.createdAtUtc -match 'Z$' -and $metadata.limits.Count -ge 4) 'Metadados devem registrar UTC e limites operacionais'
    Assert (-not $env:PGSSLMODE) 'SSL padrao nao pode alterar o ambiente do pai'
    $arguments = Get-Content -Raw -LiteralPath $marker
    Assert ($arguments.Contains('--format=custom') -and $arguments.Contains('--no-password') -and $arguments.Contains('ssl=require')) 'Processo deve usar formato custom, nao pedir senha e exigir SSL'
    foreach ($schema in $metadata.schemas) { Assert ($arguments.Contains('--schema=' + $schema)) 'Processo deve incluir todos os schemas' }
    Assert (-not ($arguments.Contains('--no-owner') -or $arguments.Contains('--no-acl'))) 'Dump deve preservar owners/grants'
    Assert (@(Get-ChildItem -LiteralPath $destination).Count -eq 2) 'Nao pode criar dump temporario em texto claro'
    $firstCipherHash = $cipherHash
    $env:PGHOST = 'aws-1-sa-east-1.pooler.supabase.com'
    $env:PGUSER = 'postgres.yfijjtibyblzuplhtxbd'
    $env:PGSSLMODE = 'verify-full'
    $null = & $backupScript -PgDumpPath $fakeDump -OutputDirectory $destination
    Assert (@(Get-ChildItem -LiteralPath $destination -Filter '*.dump.dpapi').Count -eq 2) 'Nova execucao nao pode sobrescrever dump anterior'
    Assert ((Get-FileHash -LiteralPath $dumpFiles[0].FullName -Algorithm SHA256).Hash.ToLowerInvariant() -eq $firstCipherHash) 'Artefato anterior deve permanecer identico'

    $caseNumber = 0
    foreach ($case in @(
        @{ Name = 'ref incorreto'; Project = 'aaaaaaaaaaaaaaaaaaaa' },
        @{ Name = 'host incorreto'; Host = 'db.aaaaaaaaaaaaaaaaaaaa.supabase.co' },
        @{ Name = 'usuario incorreto'; User = 'postgres.outro' },
        @{ Name = 'banco incorreto'; Database = 'outro' },
        @{ Name = 'porta transaction'; Port = '6543' },
        @{ Name = 'SSL desabilitado'; Ssl = 'disable' },
        @{ Name = 'endereco alternativo'; HostAddress = '127.0.0.1' },
        @{ Name = 'servico alternativo'; Service = 'outro' },
        @{ Name = 'destino repo'; Repo = $true },
        @{ Name = 'versao antiga'; Mode = 'old-version'; Process = $true },
        @{ Name = 'processo falhou'; Mode = 'failure'; Process = $true },
        @{ Name = 'formato invalido'; Mode = 'invalid'; Process = $true },
        @{ Name = 'timeout'; Mode = 'timeout'; Process = $true }
    )) {
        $caseNumber++
        $env:PGHOST = 'db.yfijjtibyblzuplhtxbd.supabase.co'
        $env:PGUSER = 'postgres'
        $env:PGDATABASE = 'postgres'
        $env:PGPORT = '5432'
        $env:PGSSLMODE = 'require'
        $env:PGHOSTADDR = $null
        $env:PGSERVICE = $null
        $env:DECKY_FAKE_MODE = 'success'
        if ($case.Host) { $env:PGHOST = $case.Host }
        if ($case.User) { $env:PGUSER = $case.User }
        if ($case.Database) { $env:PGDATABASE = $case.Database }
        if ($case.Port) { $env:PGPORT = $case.Port }
        if ($case.Ssl) { $env:PGSSLMODE = $case.Ssl }
        if ($case.HostAddress) { $env:PGHOSTADDR = $case.HostAddress }
        if ($case.Service) { $env:PGSERVICE = $case.Service }
        if ($case.Mode) { $env:DECKY_FAKE_MODE = $case.Mode }
        $lengthBefore = (Get-Item -LiteralPath $marker).Length
        $caseDestination = Join-Path $testRoot ('refused-' + $caseNumber)
        if ($case.Repo) { $caseDestination = Join-Path $PSScriptRoot '../../.expo/validation-v2/must-not-backup' }
        $parameters = @{ PgDumpPath = $fakeDump; OutputDirectory = $caseDestination; TimeoutSeconds = 1 }
        if ($case.Project) { $parameters.Project = $case.Project }
        $failure = $null
        try { $null = & $backupScript @parameters } catch { $failure = $_ }
        Assert ($null -ne $failure) ('Deve recusar ' + $case.Name)
        Assert (-not $failure.ToString().Contains($env:PGPASSWORD)) ('Erro nao pode revelar senha em ' + $case.Name)
        Assert (-not (Test-Path -LiteralPath $caseDestination)) ('Falha nao pode criar destino em ' + $case.Name)
        if (-not $case.Process) { Assert ((Get-Item -LiteralPath $marker).Length -eq $lengthBefore) ('Alvo/destino deve ser validado antes de executar em ' + $case.Name) }
    }
    Write-Output ('PASS: ' + $checks + ' verificacoes sinteticas; artefatos temporarios: ' + $testRoot)
} finally {
    foreach ($name in $variables) { [Environment]::SetEnvironmentVariable($name, $original[$name], 'Process') }
}
