<#
  Publica (ou atualiza) o Revisor ICMS-ST no seu GitHub, com GitHub Pages.

  Uso, no PowerShell, dentro desta pasta:
    powershell -ExecutionPolicy Bypass -File .\publicar-no-github.ps1
    powershell -ExecutionPolicy Bypass -File .\publicar-no-github.ps1 -Repo outro-nome

  O que faz:
    1. Verifica Git e GitHub CLI (oferece instalar pelo winget se faltar).
    2. Pede o login no GitHub (gh auth login), se ainda não estiver logado.
    3. Cria o repositório público (ou usa o existente) e envia os arquivos desta pasta.
    4. Ativa o GitHub Pages na branch main e mostra o endereço do app.
  O .gitignore impede o envio de PDFs, planilhas, XMLs e backups.
#>
param(
  [string]$Repo = 'revisor-icms-st',
  [switch]$Sim
)
$ErrorActionPreference = 'Continue'
Set-Location -LiteralPath $PSScriptRoot

function Test-Cmd([string]$c) { return [bool](Get-Command $c -ErrorAction SilentlyContinue) }
function Update-PathEnv { $env:Path = [Environment]::GetEnvironmentVariable('Path', 'Machine') + ';' + [Environment]::GetEnvironmentVariable('Path', 'User') }

$deps = @(@{ c = 'git'; id = 'Git.Git'; nome = 'Git' }, @{ c = 'gh'; id = 'GitHub.cli'; nome = 'GitHub CLI' })
foreach ($d in $deps) {
  if (-not (Test-Cmd $d.c)) {
    if (-not $Sim) {
      $r = Read-Host "$($d.nome) não encontrado. Instalar agora com o winget? (s/n)"
      if ($r -notmatch '^[sS]') { Write-Host "Instale o $($d.nome) e rode o script de novo."; exit 1 }
    }
    winget install --id $d.id -e --source winget
    Update-PathEnv
    if (-not (Test-Cmd $d.c)) { Write-Host "Não foi possível encontrar o $($d.nome) após a instalação. Feche e abra o PowerShell e rode de novo."; exit 1 }
  }
}

gh auth status *> $null
if ($LASTEXITCODE -ne 0) {
  Write-Host 'Faça o login no GitHub na janela do navegador que vai abrir.'
  gh auth login --web --git-protocol https
  if ($LASTEXITCODE -ne 0) { Write-Host 'Login não concluído.'; exit 1 }
}

$login = (gh api user --jq .login).Trim()
$uid = (gh api user --jq .id).Trim()
Write-Host "Conta GitHub: $login"

if (-not (Test-Path -LiteralPath '.git')) { git init -b main | Out-Null }
if (-not (git config user.name)) { git config user.name $login }
if (-not (git config user.email)) { git config user.email "$uid+$login@users.noreply.github.com" }

git add -A
git diff --cached --quiet
if ($LASTEXITCODE -ne 0) {
  git commit -q -m 'Revisor ICMS-ST: atualização' -m 'Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>'
}

gh repo view "$login/$Repo" *> $null
if ($LASTEXITCODE -ne 0) {
  gh repo create "$login/$Repo" --public --source . --remote origin --push --description 'Revisão de cobranças de ICMS-ST e Equalização (SEFAZ/MS) para empresas do Simples Nacional'
  if ($LASTEXITCODE -ne 0) { Write-Host 'Falha ao criar o repositório.'; exit 1 }
} else {
  $remotes = @(git remote)
  if ($remotes -notcontains 'origin') { git remote add origin "https://github.com/$login/$Repo.git" }
  git push -u origin main
  if ($LASTEXITCODE -ne 0) { Write-Host 'Falha ao enviar os arquivos.'; exit 1 }
}

gh api "repos/$login/$Repo/pages" *> $null
if ($LASTEXITCODE -ne 0) {
  gh api -X POST "repos/$login/$Repo/pages" -f 'source[branch]=main' -f 'source[path]=/' *> $null
  if ($LASTEXITCODE -ne 0) { Write-Host 'Ative manualmente: Settings > Pages > Deploy from a branch > main / (root).' }
}

Write-Host ''
Write-Host "Pronto! Em 1 a 2 minutos o app estará em: https://$login.github.io/$Repo/" -ForegroundColor Green
Write-Host "Repositório: https://github.com/$login/$Repo"
