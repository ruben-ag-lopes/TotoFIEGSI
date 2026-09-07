' Lanca o duckdns.js sem abrir janela de consola.
' Usado pela tarefa agendada "TotoFIEGSI - DuckDNS", para o ecra nao piscar
' de 5 em 5 minutos. Correr a mao: cscript duckdns-silencioso.vbs
Dim shell, pasta
Set shell = CreateObject("WScript.Shell")
pasta = Left(WScript.ScriptFullName, InStrRev(WScript.ScriptFullName, "\"))
shell.CurrentDirectory = pasta
shell.Run "node.exe """ & pasta & "duckdns.js""", 0, False
