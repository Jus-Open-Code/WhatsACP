Set fso = CreateObject("Scripting.FileSystemObject")
currentDir = fso.GetParentFolderName(WScript.ScriptFullName)
Set WshShell = CreateObject("WScript.Shell")
WshShell.Run chr(34) & currentDir & "\start_backend.bat" & Chr(34), 0, False
WshShell.Run chr(34) & currentDir & "\start_dashboard.bat" & Chr(34), 0, False
Set WshShell = Nothing
Set fso = Nothing
