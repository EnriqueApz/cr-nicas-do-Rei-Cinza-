#!/usr/bin/env bash
# Gera assistente-de-combate.zip na raiz do repositório, só com o que a extensão precisa.
set -euo pipefail
cd "$(dirname "$0")"
saida="../assistente-de-combate.zip"
rm -f "$saida"
zip -qr "$saida" manifest.json src
echo "Gerado: $saida"
