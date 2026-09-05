#ifndef MyAppVersion
  #define MyAppVersion "0.1.0"
#endif
#ifndef StageDir
  #define StageDir "."
#endif
#ifndef OutputDir
  #define OutputDir "."
#endif

[Setup]
AppId={{7A31C221-9F96-4D93-A350-5E8141F0D58F}
AppName=Instara Crew
AppVersion={#MyAppVersion}
AppVerName=Instara Crew {#MyAppVersion} - by LUC4N3X
AppPublisher=LUC4N3X
AppPublisherURL=https://github.com/LUC4N3X
AppSupportURL=https://github.com/LUC4N3X/Instara-Crew/issues
AppUpdatesURL=https://github.com/LUC4N3X/Instara-Crew/releases
DefaultDirName={localappdata}\Programs\Instara Crew
DefaultGroupName=Instara Crew
DisableProgramGroupPage=yes
PrivilegesRequired=lowest
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
OutputDir={#OutputDir}
OutputBaseFilename=Instara-Crew-Setup-{#MyAppVersion}-by-LUC4N3X
SetupIconFile={#StageDir}\Instara-Crew.ico
UninstallDisplayIcon={app}\Instara-Crew.exe
UninstallDisplayName=Instara Crew - by LUC4N3X
Compression=lzma2/ultra64
SolidCompression=yes
WizardStyle=modern
CloseApplications=yes
RestartApplications=no
VersionInfoVersion={#MyAppVersion}.0
VersionInfoCompany=LUC4N3X
VersionInfoDescription=Instara Crew standalone installer
VersionInfoProductName=Instara Crew
VersionInfoProductVersion={#MyAppVersion}
VersionInfoCopyright=Copyright (c) LUC4N3X

[Files]
Source: "{#StageDir}\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs; Excludes: "Instara-Crew.ico"
Source: "{#StageDir}\Instara-Crew.ico"; DestDir: "{app}"; Flags: ignoreversion

[Icons]
Name: "{autoprograms}\Instara Crew - by LUC4N3X"; Filename: "{app}\Instara-Crew.exe"; IconFilename: "{app}\Instara-Crew.ico"
Name: "{autodesktop}\Instara Crew"; Filename: "{app}\Instara-Crew.exe"; IconFilename: "{app}\Instara-Crew.ico"; Tasks: desktopicon

[Tasks]
Name: "desktopicon"; Description: "Crea un collegamento sul desktop"; GroupDescription: "Collegamenti:"; Flags: unchecked

[Run]
Filename: "{app}\Instara-Crew.exe"; Description: "Avvia Instara Crew - by LUC4N3X"; Flags: nowait postinstall skipifsilent
