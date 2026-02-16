# Aribike Theme Dev Container

This dev container provides a complete Shopify theme development environment with:

- **Node.js 20** - for JavaScript tooling
- **Ruby 3.2** - for Shopify CLI
- **Git + GitHub CLI** - version control
- **Shopify CLI** - theme development tools
- **VSCode Extensions** - auto-installed (themes, Liquid support, etc.)
- **Dynamic Theme & Font** - automatically configured

---

## 🎨 Dynamic Theme & Font Configuration

### **Theme (⚠️ One-time Setup)**

The container uses:
- **Color Theme:** Dracula Pro (Van Helsing)
- **Icon Theme:** Material Icon Theme

**First time in container:**
1. Container opens and installs extensions
2. Install Dracula Pro VSIX (one-time):
   - `Cmd+Shift+P` → "Extensions: Install from VSIX..."
   - Navigate to: `/workspaces/aribike-theme/.devcontainer/extensions/dracula-pro.vsix`
   - Select and install
   - Reload window when prompted
3. Theme auto-activates (configured in settings)
4. **Theme persists** - no reinstall needed on container rebuilds

### **Font (⚠️ One-time Setup Per Mac)**

**Configured Font:** JetBrainsMono Nerd Font Mono with ligatures

Nerd Font includes additional glyphs and icons (powerline symbols, file type icons, etc.) for enhanced terminal and editor display.

**Why a script?** VSCode runs on your Mac (not in the container), so fonts must be installed on macOS itself.

**First time on a new Mac:**

```bash
# From project root
./.devcontainer/install-fonts.sh
```

This downloads and installs JetBrainsMono Nerd Font to `~/Library/Fonts`.

**Fallback:** If you skip the font install, it automatically falls back to macOS default fonts (SF Mono, Menlo, Monaco).

---

## 🚀 Getting Started

### First Time Setup

1. **Install prerequisites:**
   - Docker Desktop
   - VSCode
   - VSCode Dev Containers extension

2. **Install font (once per Mac):**
   ```bash
   ./.devcontainer/install-fonts.sh
   ```

3. **Open project in VSCode:**
   ```bash
   code /Users/john/code/shopify/aribike-theme
   ```

4. **When prompted, click "Reopen in Container"**
   - First time: builds container (~3-5 minutes)
   - Installs Shopify CLI and extensions
   - Subsequent opens: uses cached container (~10 seconds)

5. **Install Dracula Pro theme (first time only):**
   - `Cmd+Shift+P` → "Extensions: Install from VSIX..."
   - Select: `/workspaces/aribike-theme/.devcontainer/extensions/dracula-pro.vsix`
   - Reload window when prompted
   - Theme persists across container rebuilds

### Working in the Container

Once the container loads (and Dracula Pro is installed):

- **Theme:** Dracula Pro (Van Helsing) is active
- **Font:** JetBrainsMono Nerd Font Mono is configured
- **Extensions:** All Shopify/Liquid tools ready
- **Shopify CLI:** Available via `shopify theme dev`

**Start development server:**
```bash
shopify theme dev
```

---

## 📦 What's Included

### Extensions (Auto-installed)

**Theme & UI:**
- Dracula Pro (Van Helsing)
- Material Icon Theme

**Shopify Development:**
- Shopify Theme Check
- Shopify Liquid syntax highlighting

**Code Quality:**
- ESLint
- Prettier

**Utilities:**
- Auto Rename Tag
- Path Intellisense
- Error Lens
- TODO Highlight

### Tools

- **Shopify CLI** - theme development and deployment
- **Node.js 20** - JavaScript runtime
- **Ruby 3.2** - for Shopify CLI
- **Git + GitHub CLI** - version control

---

## 🔧 Customization

### Change Theme

Edit `.devcontainer/devcontainer.json`:

```json
{
  "customizations": {
    "vscode": {
      "extensions": [
        "GitHub.github-vscode-theme"  // Add new theme extension
      ],
      "settings": {
        "workbench.colorTheme": "GitHub Dark"  // Change theme name
      }
    }
  }
}
```

Rebuild container: `Cmd+Shift+P` → "Dev Containers: Rebuild Container"

### Change Font

**Option 1: Use different Nerd Font**

1. Install your preferred Nerd Font on macOS
2. Update `.devcontainer/devcontainer.json`:
   ```json
   {
     "settings": {
       "editor.fontFamily": "'FiraCode Nerd Font Mono', Menlo, monospace"
     }
   }
   ```

**Option 2: Use macOS default fonts only**

```json
{
  "settings": {
    "editor.fontFamily": "Menlo, Monaco, 'Courier New', monospace",
    "editor.fontLigatures": false
  }
}
```

No installation needed - these fonts come with macOS.

### Add More Extensions

Add to the `extensions` array in `devcontainer.json`:

```json
{
  "extensions": [
    "existing.extensions",
    "new.extension-id"
  ]
}
```

Find extension IDs: Extensions panel → Right-click extension → Copy Extension ID

---

## 🔄 Using on Multiple Macs

**Mac #1 (first time):**
1. Run `./.devcontainer/install-fonts.sh`
2. Open project in VSCode
3. Reopen in container
4. **Done!** Theme, font, extensions all configured

**Mac #2 (new machine):**
1. Pull project from git
2. Run `./.devcontainer/install-fonts.sh`
3. Open project in VSCode
4. Reopen in container
5. **Identical environment** - same theme, font, extensions!

**Why it works:**
- **Theme** (Dracula Pro VSIX) is bundled and auto-installs via postCreateCommand
- **Extensions** are in the devcontainer.json (auto-install)
- **Font** script makes it reproducible across Macs (JetBrainsMono Nerd Font)
- **Settings** are in the devcontainer.json (auto-apply)

---

## 🎯 Safari Compatibility Note

Per your global settings: Always test HTML/CSS/JavaScript changes in Safari browser for compatibility.

---

## 💡 Tips

**Font not showing up?**
- Restart VSCode after running install-fonts.sh
- Check font installed: `ls ~/Library/Fonts | grep JetBrains`

**Theme not applying?**
- Wait for all extensions to install (check bottom-right notifications)
- Reload window: `Cmd+Shift+P` → "Developer: Reload Window"

**Container slow to build?**
- First build takes 3-5 minutes (downloads images, installs tools)
- Subsequent builds use cache (10-30 seconds)
- To clear cache and rebuild: `Cmd+Shift+P` → "Dev Containers: Rebuild Container Without Cache"

**Want to customize more?**
- See [VSCode Dev Containers docs](https://code.visualstudio.com/docs/devcontainers/containers)
- See [devcontainer.json reference](https://containers.dev/implementors/json_reference/)

---

## 📁 Structure

```
.devcontainer/
├── devcontainer.json      # Container configuration
├── install-fonts.sh       # Font installation script for macOS
└── README.md             # This file
```

**devcontainer.json** contains:
- Base image (Node.js + Ruby)
- Features (Git, GitHub CLI)
- Extensions (themes, Shopify tools)
- Settings (theme, font, editor config)
- Port forwarding (9292 for Shopify dev server)
- Post-create commands (Shopify CLI install)
