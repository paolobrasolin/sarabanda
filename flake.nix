{
  inputs.nixpkgs.url = "github:Nixos/nixpkgs/nixos-unstable";
  inputs.flake-utils.url = "github:numtide/flake-utils";

  outputs = {
    self,
    nixpkgs,
    flake-utils,
  }:
    flake-utils.lib.eachDefaultSystem (
      system: let
        pkgs = import nixpkgs {inherit system;};
      in {
        devShells.default = pkgs.mkShell {
          packages = with pkgs; [nodejs pnpm];
        };
        packages = rec {
          sarabanda = pkgs.stdenv.mkDerivation (finalAttrs: {
            pname = "sarabanda";
            inherit (builtins.fromJSON (builtins.readFile ./package.json)) version;
            src = ./.;
            buildInputs = with pkgs; [
              nodejs
              pnpm
              pnpm.configHook
            ];
            pnpmDeps = pkgs.pnpm.fetchDeps {
              inherit (finalAttrs) pname version src;
              hash = "sha256-nqjWcxAkZS62QhtxaHIf3RpJOc738y8mx/lvXXkEQCs=";
            };
            buildPhase = ''
              pnpm run build
            '';

            installPhase = ''
              cp -r dist $out
            '';
          });
          default = sarabanda;
        };
      }
    );
}
