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
          balcon = pkgs.stdenv.mkDerivation (finalAttrs: {
            pname = "sarafaccia";
            inherit (builtins.fromJSON (builtins.readFile ./package.json)) version;
            src = ./.;
            buildInputs = with pkgs; [
              nodejs
              pnpm
              pnpm.configHook
            ];
            pnpmDeps = pkgs.pnpm.fetchDeps {
              inherit (finalAttrs) pname version src;
              hash = "sha256-EIZekCvR0ZW3XFnrgKR/fvg08EEoHGAcw5Ks39E1SN0=";
            };
            buildPhase = ''
              pnpm run build
            '';

            installPhase = ''
              cp -r dist $out
            '';
          });
          default = balcon;
        };
      }
    );
}
