{
  description = "Trove - self-hosted save-file sync for Anbernic handhelds";

  inputs = {
    nixpkgs.url     = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = nixpkgs.legacyPackages.${system};
      in {
        packages = {
          trove   = pkgs.callPackage ./nix/package.nix {};
          default = self.packages.${system}.trove;
        };

        devShells.default = pkgs.mkShell {
          packages = with pkgs; [
            go
            gopls
            gotools
            golangci-lint
            nodejs
            pnpm
            git
            httpyac
          ];

          shellHook = ''
            echo "trove dev shell"
            echo "go $(go version | awk '{print $3}')"
            echo "node $(node --version)"
          '';
        };
      }
    ) // {
      nixosModules.default = import ./nix/module.nix;
    };
}
