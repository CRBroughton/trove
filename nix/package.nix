{ pkgs, lib }:

let
  cleanSrc = lib.cleanSourceWith {
    filter = path: _type: builtins.baseNameOf path != "node_modules";
    src = lib.cleanSource ../.;
  };

  ui = pkgs.stdenv.mkDerivation (finalAttrs: {
    pname = "trove-ui";
    version = "0.3.1";

    src = cleanSrc;

    nativeBuildInputs = with pkgs; [
      nodejs
      pnpm
      pnpmConfigHook
    ];

    pnpmDeps = pkgs.fetchPnpmDeps {
      inherit (finalAttrs) pname version src;
      fetcherVersion = 3;
      hash = "sha256-OHvJiXcAqVKAMaJssY7oxb3m7q++1z9tQGMMCBcTMz4=";
    };

    buildPhase = ''
      pnpm -F trove-ui build
    '';

    installPhase = ''
      mkdir -p $out
      cp -r internal/embed/dist/. $out/
    '';
  });
in

pkgs.buildGoModule {
  pname = "trove";
  version = "0.1.0";

  src = cleanSrc;

  vendorHash = null;

  nativeBuildInputs = [ pkgs.git ];

  preBuild = ''
    mkdir -p internal/embed/dist
    cp -r ${ui}/. internal/embed/dist/
  '';

  meta = {
    description = "Self-hosted save-file sync server for Anbernic handhelds";
    mainProgram = "trove";
    license = lib.licenses.elastic20;
  };
}
