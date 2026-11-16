' Runs the app without a console window (used for Windows autostart).
' To stop it: Task Manager -> find "python.exe" -> End task.
Set fso = CreateObject("Scripting.FileSystemObject")
Set shell = CreateObject("WScript.Shell")
folder = fso.GetParentFolderName(WScript.ScriptFullName)
shell.CurrentDirectory = folder
shell.Run """" & folder & "\venv\Scripts\python.exe"" -m uvicorn main:app --host 127.0.0.1 --port 8000", 0, False
