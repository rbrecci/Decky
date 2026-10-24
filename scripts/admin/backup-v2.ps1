[CmdletBinding()]
param(
    [string]$Project = 'yfijjtibyblzuplhtxbd',
    [string]$PgDumpPath = 'pg_dump.exe',
    [string]$OutputDirectory = (Join-Path $env:LOCALAPPDATA ('Decky/backups/' + [DateTime]::UtcNow.ToString('yyyyMMdd'))),
    [ValidateRange(1, 3600)][int]$TimeoutSeconds = 300,
    [switch]$Help
)
$ErrorActionPreference = 'Stop'
if ($Help) {
    Write-Output 'Uso: powershell.exe -NoProfile -File scripts/admin/backup-v2.ps1 [-PgDumpPath CAMINHO] [-OutputDirectory PASTA] [-TimeoutSeconds 300]'
    Write-Output 'Projeto exclusivo: yfijjtibyblzuplhtxbd. Requer PostgreSQL 17 e PGHOST/PGUSER/PGDATABASE/PGPORT no ambiente administrativo.'
    Write-Output 'Conexao direta ou pooler session na porta 5432, banco postgres e SSL require/verify-ca/verify-full. Sem PGSSLMODE, somente o processo filho recebe require.'
    Write-Output 'Senha somente pelo ambiente libpq ou pgpass administrativo. Nao le .env, nao recebe senha por argumento e nao executa reset.'
    Write-Output 'Grava apenas dump DPAPI CurrentUser e metadados fora do repositorio. Depende do mesmo perfil Windows.'
    Write-Output 'Nao restaura servicos, configuracao, roles globais nem arquivos Storage. Nao comprova recuperacao operacional hospedada.'
    return
}
if ($Project -cne 'yfijjtibyblzuplhtxbd') { throw 'Projeto diferente do Decky.' }
$direct = $env:PGHOST -ceq ('db.' + $Project + '.supabase.co') -and $env:PGUSER -ceq 'postgres'
$pooler = $env:PGHOST -cmatch '^[a-z0-9-]+\.pooler\.supabase\.com$' -and $env:PGUSER -ceq ('postgres.' + $Project)
if ((-not $direct -and -not $pooler) -or $env:PGDATABASE -cne 'postgres' -or $env:PGPORT -cne '5432') {
    throw 'Alvo PostgreSQL invalido: confira host, usuario, banco e porta session do Decky.'
}
if ($env:PGHOSTADDR -or $env:PGSERVICE -or $env:PGSERVICEFILE) { throw 'Remova PGHOSTADDR/PGSERVICE/PGSERVICEFILE para evitar alvo alternativo.' }
$sslMode = if ($env:PGSSLMODE) { $env:PGSSLMODE } else { 'require' }
if ($sslMode -cnotin @('require', 'verify-ca', 'verify-full')) { throw 'PGSSLMODE deve exigir SSL.' }

$workspace = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../..')).TrimEnd('\', '/')
$destination = [System.IO.Path]::GetFullPath($OutputDirectory)
if ($destination.Equals($workspace, [StringComparison]::OrdinalIgnoreCase) -or $destination.StartsWith($workspace + '\', [StringComparison]::OrdinalIgnoreCase)) {
    throw 'Destino deve ficar fora do repositorio.'
}
$ancestor = $destination
while ($ancestor) {
    if ([System.IO.File]::Exists($ancestor)) { throw 'Destino ou ancestral nao e diretorio.' }
    if ([System.IO.Directory]::Exists($ancestor) -and (([System.IO.File]::GetAttributes($ancestor) -band [System.IO.FileAttributes]::ReparsePoint) -ne 0)) {
        throw 'Destino com junction ou link nao e aceito.'
    }
    $ancestor = [System.IO.Path]::GetDirectoryName($ancestor)
}
$executable = @(Get-Command -Name $PgDumpPath -CommandType Application -ErrorAction SilentlyContinue)[0]
if (-not $executable -or [System.IO.Path]::GetExtension($executable.Source) -ine '.exe') { throw 'Informe o executavel pg_dump.exe do PostgreSQL 17.' }

function Invoke-DumpProcess([string]$Arguments) {
    $process = New-Object System.Diagnostics.Process
    $process.StartInfo = New-Object System.Diagnostics.ProcessStartInfo
    $process.StartInfo.FileName = $executable.Source
    $process.StartInfo.Arguments = $Arguments
    $process.StartInfo.UseShellExecute = $false
    $process.StartInfo.CreateNoWindow = $true
    $process.StartInfo.RedirectStandardOutput = $true
    $process.StartInfo.RedirectStandardError = $true
    $process.StartInfo.EnvironmentVariables['PGSSLMODE'] = $sslMode
    $memory = New-Object System.IO.MemoryStream
    $started = $false
    $clock = [System.Diagnostics.Stopwatch]::StartNew()
    try {
        $started = $process.Start()
        if (-not $started) { throw 'Nao foi possivel iniciar pg_dump.' }
        $stdout = $process.StandardOutput.BaseStream.CopyToAsync($memory)
        $stderr = $process.StandardError.ReadToEndAsync()
        if (-not $process.WaitForExit($TimeoutSeconds * 1000)) { throw 'pg_dump excedeu o timeout; nenhum backup foi gravado.' }
        $remaining = [Math]::Max(0, ($TimeoutSeconds * 1000) - [int]$clock.ElapsedMilliseconds)
        if (-not [System.Threading.Tasks.Task]::WaitAll([System.Threading.Tasks.Task[]]@($stdout, $stderr), $remaining)) {
            throw 'Leitura do pg_dump excedeu o timeout; nenhum backup foi gravado.'
        }
        if ($process.ExitCode -ne 0) { throw 'pg_dump falhou; stderr omitido para proteger credenciais. Nenhum backup foi gravado.' }
        return ,$memory.ToArray()
    } finally {
        if ($started -and -not $process.HasExited) { $process.Kill(); $process.WaitForExit() }
        if ($memory.Capacity -gt 0) { [Array]::Clear($memory.GetBuffer(), 0, $memory.Capacity) }
        $memory.Dispose()
        $process.Dispose()
        $clock.Stop()
    }
}
function Get-Sha256([byte[]]$Bytes) {
    $sha = [System.Security.Cryptography.SHA256]::Create()
    try { return ([BitConverter]::ToString($sha.ComputeHash($Bytes))).Replace('-', '').ToLowerInvariant() }
    finally { $sha.Dispose() }
}

$versionBytes = Invoke-DumpProcess '--version'
$versionText = [System.Text.Encoding]::UTF8.GetString($versionBytes)
if ($versionText -notmatch '^pg_dump \(PostgreSQL\) (17(?:\.\d+)+)(?:[^\r\n]*)?\r?\n?$') { throw 'pg_dump deve ser da versao principal PostgreSQL 17.' }
$version = $Matches[1]
$schemas = @('public', 'private', 'auth', 'storage', 'supabase_migrations')
$arguments = '--format=custom --no-password ' + (($schemas | ForEach-Object { '--schema=' + $_ }) -join ' ')
Add-Type -AssemblyName System.Security
$plain = $null
$roundtrip = $null
try {
    [byte[]]$plain = Invoke-DumpProcess $arguments
    if ($plain.Length -lt 5 -or [System.Text.Encoding]::ASCII.GetString($plain, 0, 5) -cne 'PGDMP') { throw 'pg_dump nao retornou arquivo custom PGDMP; nenhum backup foi gravado.' }
    $plainHash = Get-Sha256 $plain
    $cipher = [System.Security.Cryptography.ProtectedData]::Protect($plain, $null, [System.Security.Cryptography.DataProtectionScope]::CurrentUser)
    $roundtrip = [System.Security.Cryptography.ProtectedData]::Unprotect($cipher, $null, [System.Security.Cryptography.DataProtectionScope]::CurrentUser)
    if ($plain.Length -ne $roundtrip.Length -or $plainHash -cne (Get-Sha256 $roundtrip)) { throw 'Conferencia DPAPI falhou; nenhum backup foi gravado.' }
    $created = [DateTime]::UtcNow
    $name = 'decky-pre-reset-' + $created.ToString('yyyyMMddTHHmmssfffZ') + '-' + [guid]::NewGuid().ToString('N') + '.dump.dpapi'
    $dumpPath = Join-Path $destination $name
    $metadataPath = $dumpPath + '.json'
    $metadata = [ordered]@{
        createdAtUtc = $created.ToString('o'); project = $Project; schemas = $schemas; pgDumpVersion = $version
        protection = 'DPAPI CurrentUser'; plaintextBytes = $plain.Length; ciphertextBytes = $cipher.Length
        plaintextSha256 = $plainHash; ciphertextSha256 = (Get-Sha256 $cipher)
        scope = 'Arquivo custom dos schemas selecionados, com owners e grants preservados.'
        limits = @('Depende do mesmo perfil Windows e da chave DPAPI.', 'Nao inclui roles globais do PostgreSQL.', 'Nao inclui arquivos binarios do Storage.', 'Nao inclui configuracao ou servicos hospedados Auth/SMTP/Google/Edge Functions.', 'Roundtrip local nao comprova restauracao operacional hospedada.')
    }
    $utf8 = New-Object System.Text.UTF8Encoding($false)
    $metadataBytes = $utf8.GetBytes(($metadata | ConvertTo-Json -Depth 4) + "`n")
    [void][System.IO.Directory]::CreateDirectory($destination)
    $stream = [System.IO.File]::Open($dumpPath, [System.IO.FileMode]::CreateNew, [System.IO.FileAccess]::Write, [System.IO.FileShare]::None)
    try { $stream.Write($cipher, 0, $cipher.Length) } finally { $stream.Dispose() }
    $stream = [System.IO.File]::Open($metadataPath, [System.IO.FileMode]::CreateNew, [System.IO.FileAccess]::Write, [System.IO.FileShare]::None)
    try { $stream.Write($metadataBytes, 0, $metadataBytes.Length) } finally { $stream.Dispose() }
    Write-Output ('Backup cifrado: ' + $dumpPath)
    Write-Output ('Metadados: ' + $metadataPath)
} finally {
    if ($plain) { [Array]::Clear($plain, 0, $plain.Length) }
    if ($roundtrip) { [Array]::Clear($roundtrip, 0, $roundtrip.Length) }
}
