$AppName = "Bhuwan Automation"
$AppID = "Bhuwan.Automation"

$StartMenu = [Environment]::GetFolderPath("Programs")
$ShortcutPath = Join-Path $StartMenu "$AppName.lnk"

$ProjectPath = (Get-Location).Path
$NodePath = (Get-Command node).Source

$WScript = New-Object -ComObject WScript.Shell
$Shortcut = $WScript.CreateShortcut($ShortcutPath)

$Shortcut.TargetPath = $NodePath
$Shortcut.Arguments = "--version"
$Shortcut.WorkingDirectory = $ProjectPath
$Shortcut.Description = $AppName
$Shortcut.Save()

Write-Host "Shortcut created at: $ShortcutPath"