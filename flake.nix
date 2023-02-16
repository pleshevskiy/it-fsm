{
  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixpkgs-unstable";
    flake-utils.url = "github:numtide/flake-utils";
    wd2.url = "git+https://git.pleshevski.ru/pleshevskiy/wd2";
  };

  outputs = { self, nixpkgs, flake-utils, wd2, ... }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = import nixpkgs { inherit system; };
      in
      {
        devShells.default = pkgs.mkShell {
          packages = with pkgs; [
            wd2.packages.${system}.default
            deno
            nodejs-18_x
            nodePackages.typescript
          ];
        };
      });
}
