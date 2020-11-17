const builder = require("electron-builder");
const Platform = builder.Platform;

function getCurrentPlatform() {
  switch (process.platform) {
    case "win32":
      return Platform.WINDOWS;
    case "darwin":
      return Platform.MAC;
    case "linux":
      return Platform.linux;
    default:
      console.error("Cannot resolve current platform!");
      return undefined;
  }
}

builder
  .build({
    targets: (process.argv[2] != null && Platform[process.argv[2]] != null
      ? Platform[process.argv[2]]
      : getCurrentPlatform()
    ).createTarget(),
    config: {
      appId: "hqcraftlauncher",
      productName: "HQCraft Launcher",
      artifactName: "hqcraftsetup-${os}-${version}-stable.${ext}",
      copyright: "Copyright © 2019 Piotr Stadnicki",
      directories: {
        buildResources: "build",
        output: "dist",
      },
      win: {
        target: [
          {
            target: "nsis",
            arch: "x64",
          },
        ],
        publish: {
          url: "https://updates.hqcraft.pl/update/${platform}",
          provider: "generic",
          channel: "stable",
        },
      },
      nsis: {
        oneClick: false,
        perMachine: false,
        allowElevation: true,
        allowToChangeInstallationDirectory: true,
      },
      mac: {
        target: "dmg",
        category: "public.app-category.games",
        publish: {
          url: "https://updates.hqcraft.pl/update/${platform}",
          provider: "generic",
          channel: "stable",
        },
      },
      linux: {
        target: "AppImage",
        maintainer: "Piotr Stadnicki",
        vendor: "Piotr Stadnicki",
        synopsis: "Launcher paczki modów HQCraft",
        description: "Witaj w HQCraft",
        category: "Game",
        publish: {
          url: "https://updates.hqcraft.pl/update/${platform}",
          provider: "generic",
          channel: "stable",
        },
      },
      compression: "maximum",
      files: [
        "!{dist,.gitignore,.vscode,docs,dev-app-update.yml,.travis.yml,.nvmrc,.eslintrc.json,build.js}",
      ],
      extraResources: ["libraries"],
      asar: true,
    },
  })
  .then(() => {
    console.log("Build complete!");
  })
  .catch((err) => {
    console.error("Error during build!", err);
  });
