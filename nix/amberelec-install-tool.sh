#!/bin/bash
# Reinstalls the Trove Trade entry in EmulationStation Tools.
# Called from /storage/.config/custom_start.sh on boot so it survives
# AmberELEC's rsync wipe of /storage/.config/distribution/modules/.
#
# Setup: add this line to the "before" case in /storage/.config/custom_start.sh:
#   /storage/.config/trove/install-tool.sh

TOOLS_DIR="/storage/.config/distribution/modules"
ENTRY="$TOOLS_DIR/Trove Trade.sh"
GAMELIST="$TOOLS_DIR/gamelist.xml"

if [ ! -f "$ENTRY" ]; then
  printf "#!/bin/bash\n/storage/.config/trove/sync.sh trade\n" > "$ENTRY"
  chmod +x "$ENTRY"
fi

if [ -f "$GAMELIST" ] && ! grep -q "Trove Trade" "$GAMELIST"; then
  sed -i "s|</gameList>|\t<game>\n\t\t<path>./Trove Trade.sh</path>\n\t\t<name>Trove Trade</name>\n\t\t<desc>Announce ROM library and process pending trades.</desc>\n\t\t<developer>trove</developer>\n\t\t<publisher>trove</publisher>\n\t\t<rating>1.0</rating>\n\t\t<releasedate>2026</releasedate>\n\t\t<genre>Script</genre>\n\t</game>\n</gameList>|" "$GAMELIST"
fi
