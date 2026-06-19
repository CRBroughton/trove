{ config, lib, pkgs, ... }:

let
  cfg = config.services.trove;
  trovePkg = pkgs.callPackage ./package.nix {};
in

{
  options.services.trove = {
    enable = lib.mkEnableOption "trove save-file sync server";

    package = lib.mkOption {
      type    = lib.types.package;
      default = trovePkg;
      description = "The trove package to use.";
    };

    port = lib.mkOption {
      type    = lib.types.port;
      default = 8080;
      description = "TCP port for the HTTP server.";
    };

    dataDir = lib.mkOption {
      type    = lib.types.str;
      default = "/var/lib/trove";
      description = "Directory where the git working tree is stored.";
    };

    user = lib.mkOption {
      type    = lib.types.str;
      default = "trove";
      description = "Unix user the service runs as.";
    };

    group = lib.mkOption {
      type    = lib.types.str;
      default = "trove";
      description = "Unix group the service runs as.";
    };

    openFirewall = lib.mkOption {
      type    = lib.types.bool;
      default = false;
      description = ''
        Open the trove port in the firewall.
        Leave false when using Tailscale — the service is reachable on the
        Tailnet without opening a public port.
      '';
    };
  };

  config = lib.mkIf cfg.enable {
    users.users.${cfg.user} = {
      isSystemUser = true;
      group        = cfg.group;
      home         = cfg.dataDir;
      createHome   = false;
      description  = "trove service user";
    };

    users.groups.${cfg.group} = {};

    systemd.tmpfiles.rules = [
      "d '${cfg.dataDir}' 0750 ${cfg.user} ${cfg.group} - -"
    ];

    environment.systemPackages = [ pkgs.git ];

    systemd.services.trove = {
      description = "trove — Anbernic save-file sync server";
      wantedBy    = [ "multi-user.target" ];
      after       = [ "network.target" ];

      path = [ pkgs.git ];

      environment = {
        GIT_AUTHOR_NAME  = "trove";
        GIT_AUTHOR_EMAIL = "trove@localhost";
        HOME             = cfg.dataDir;
      };

      serviceConfig = {
        Type             = "simple";
        User             = cfg.user;
        Group            = cfg.group;
        WorkingDirectory = cfg.dataDir;

        ExecStart = "${lib.getExe cfg.package} -repo ${cfg.dataDir}/saves -addr :${toString cfg.port}";

        Restart    = "on-failure";
        RestartSec = "5s";

        NoNewPrivileges      = true;
        PrivateTmp           = true;
        ProtectSystem        = "strict";
        ReadWritePaths       = [ cfg.dataDir ];
        ProtectHome          = true;
        CapabilityBoundingSet = "";
        LockPersonality      = true;
        RestrictRealtime     = true;
      };
    };

    networking.firewall.allowedTCPPorts = lib.mkIf cfg.openFirewall [ cfg.port ];
  };
}
