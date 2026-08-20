"use strict";
/**
 * Threat intelligence data for VS Code extension auditing.
 * Source: GlassWorm & supply-chain security threat feeds (418 canonical malicious IDs).
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DECODER_PATTERN_REGEX = exports.LEGIT_LIB_REGEX = exports.INVISIBLE_UNICODE_BYTE_REGEX = exports.INVISIBLE_UNICODE_RUN_REGEX = exports.VS_RUN_MIN = exports.WAVE_MARKER = exports.COMPROMISED_EXTENSIONS = void 0;
exports.COMPROMISED_EXTENSIONS = {
    "365businessdevelopment.bdev-al-xml-doc": {
        "campaign": "evil-twin",
        "source": "Manifold Security"
    },
    "96-studio.json-formatter": {
        "campaign": "wave-5",
        "source": "Socket.dev"
    },
    "aadarkcode.one-dark-material": {
        "campaign": "wave-5",
        "source": "Koi Security"
    },
    "aadityanarayan.code-snap": {
        "campaign": "solana-may-2026",
        "source": "Yeeth Security"
    },
    "academiadosdevs.javafx": {
        "campaign": "evil-twin",
        "source": "Manifold Security"
    },
    "adhamu.history-in-sublime-merge": {
        "campaign": "wave-2",
        "source": "Koi Security"
    },
    "ai-driven-dev.ai-driven-dev": {
        "campaign": "wave-2",
        "source": "Koi Security"
    },
    "akmittal.hugofy": {
        "campaign": "evil-twin-apee",
        "source": "Yeeth Security"
    },
    "alduncanson.react-hooks-snippets": {
        "campaign": "evil-twin",
        "source": "Manifold Security"
    },
    "alex-chen.gitee-code-settings-sync": {
        "campaign": "evil-twin",
        "source": "Manifold Security"
    },
    "aligntool.extension-align-professional-tool": {
        "campaign": "wave-5",
        "source": "Koi Security"
    },
    "amd.gaia-vscode": {
        "campaign": "evil-twin",
        "source": "Manifold Security"
    },
    "andenetalexander.vim-cheatsheet": {
        "campaign": "evil-twin",
        "source": "Manifold Security"
    },
    "andreyvolosovich.monokai-st3": {
        "campaign": "evil-twin",
        "source": "Manifold Security"
    },
    "anessaeah.php-intelephense-language-support": {
        "campaign": "glassworm-v2",
        "source": "Socket.dev"
    },
    "angelo-breuer.license-header-manager": {
        "campaign": "evil-twin",
        "source": "Manifold Security"
    },
    "angular-studio.ng-angular-extension": {
        "campaign": "wave-5",
        "source": "Koi Security"
    },
    "ansvia.ansvia-vscode": {
        "campaign": "solana-may-2026",
        "source": "Yeeth Security"
    },
    "archchainturn.twinny-ai-assist": {
        "campaign": "sleeper-73",
        "source": "Socket.dev"
    },
    "arieldev.sql-visual-debugger": {
        "campaign": "solana-may-2026",
        "source": "Yeeth Security"
    },
    "arikfr.paraglide-vscode": {
        "campaign": "evil-twin-apee",
        "source": "Yeeth Security"
    },
    "artsy.artsy-studio-extension-pack": {
        "campaign": "evil-twin",
        "source": "Manifold Security"
    },
    "asadbinimtiaz.kiro-vscode-extension": {
        "campaign": "solana-may-2026",
        "source": "Yeeth Security"
    },
    "ashhaddevlab.customtkinter-snippets": {
        "campaign": "evil-twin",
        "source": "Manifold Security"
    },
    "awesome-codebase.codebase-dart-pro": {
        "campaign": "wave-5",
        "source": "Koi Security"
    },
    "awesome-codespace.jinja-language-support": {
        "campaign": "wave-5",
        "source": "Socket.dev"
    },
    "awesomeco.wonder-for-vscode-icons": {
        "campaign": "wave-5",
        "source": "Koi Security"
    },
    "awwwadem.language-professional-tools": {
        "campaign": "wave-5",
        "source": "Socket.dev"
    },
    "azureadb2ctools.aadb2c": {
        "campaign": "evil-twin",
        "source": "Manifold Security"
    },
    "azurepolicy.azurepolicyextension": {
        "campaign": "evil-twin",
        "source": "Manifold Security"
    },
    "baksmink.vscode-quokka-extension": {
        "campaign": "wave-5",
        "source": "Socket.dev"
    },
    "bansheejust22.retro-vhs-theme": {
        "campaign": "wave-5",
        "source": "Socket.dev"
    },
    "bartmanabyss.amiga-debug": {
        "campaign": "evil-twin",
        "source": "Manifold Security"
    },
    "bdaeumer.vscode-eslint": {
        "campaign": "evil-twin",
        "source": "Manifold Security"
    },
    "bdznh.c-cpp-compile-run-windows": {
        "campaign": "evil-twin",
        "source": "Manifold Security"
    },
    "bersenev.mc-super-pilot": {
        "campaign": "sleeper-73",
        "source": "Socket.dev"
    },
    "better-ts-errors.better-ts-errors": {
        "campaign": "evil-twin",
        "source": "Manifold Security"
    },
    "bhbpbarn.vsce-python-indent-extension": {
        "campaign": "wave-5",
        "source": "Koi Security"
    },
    "bigboi.legally-blind": {
        "campaign": "solana-may-2026",
        "source": "Yeeth Security"
    },
    "blockstoks.easily-gitignore-manage": {
        "campaign": "wave-5",
        "source": "Koi Security"
    },
    "boulderzitunnel.vscode-buddies": {
        "campaign": "sleeper-73",
        "source": "Socket.dev"
    },
    "bphpburn.icons-vscode": {
        "campaign": "wave-3",
        "source": "Koi Security"
    },
    "bphpburnsus.iconesvscode": {
        "campaign": "wave-3",
        "source": "Koi Security"
    },
    "bradymholt.pgformatter": {
        "campaign": "evil-twin",
        "source": "Manifold Security"
    },
    "brategmaqendaalar-studio.pro-prettyxml-formatter": {
        "campaign": "wave-5",
        "source": "Koi Security"
    },
    "breluven.html-smart-suite": {
        "campaign": "sleeper-73",
        "source": "Socket.dev"
    },
    "brenaven.cursor-rich-helper": {
        "campaign": "sleeper-73",
        "source": "Socket.dev"
    },
    "bretdoyle.javascript-extensions-pack---js-essentials": {
        "campaign": "evil-twin",
        "source": "Manifold Security"
    },
    "brixmundo.eca-easy-tool": {
        "campaign": "sleeper-73",
        "source": "Socket.dev"
    },
    "brixovik.es7-quick-hub": {
        "campaign": "sleeper-73",
        "source": "Socket.dev"
    },
    "buryagin.openapi-easy-studio": {
        "campaign": "sleeper-73",
        "source": "Socket.dev"
    },
    "bytegenius.go-live-pro": {
        "campaign": "solana-may-2026",
        "source": "Yeeth Security"
    },
    "calow-dex.prisma-database-schema-tools": {
        "campaign": "wave-5",
        "source": "Socket.dev"
    },
    "carveltstone.chatbuddy-auto-suite": {
        "campaign": "sleeper-73",
        "source": "Socket.dev"
    },
    "casualjim.gotemplate": {
        "campaign": "evil-twin",
        "source": "Manifold Security"
    },
    "catspace-studio.ng-angular-language": {
        "campaign": "glassworm-v2",
        "source": "Socket.dev"
    },
    "celsoaf.brightscript": {
        "campaign": "evil-twin-apee",
        "source": "Yeeth Security"
    },
    "chavyleung.vscode-pnpm-verlens": {
        "campaign": "evil-twin",
        "source": "Manifold Security"
    },
    "chris-hock.pioasm": {
        "campaign": "evil-twin",
        "source": "Manifold Security"
    },
    "clangdcode.clangd-vsce": {
        "campaign": "wave-3",
        "source": "Koi Security"
    },
    "clangdcode.clangd-vscode": {
        "campaign": "wave-3",
        "source": "Koi Security"
    },
    "cliagenball.cline-agent-extension": {
        "campaign": "glassworm-v2",
        "source": "Socket.dev"
    },
    "cline-ai-main.cline-ai-agent": {
        "campaign": "wave-1",
        "source": "Koi Security"
    },
    "closedtierenchant.vscode-awesome-icons": {
        "campaign": "sleeper-73",
        "source": "Socket.dev"
    },
    "clotomoto.code-way-editor": {
        "campaign": "glassworm-v2",
        "source": "Socket.dev"
    },
    "cod-vok.arko-dev-devsecops": {
        "campaign": "wave-5",
        "source": "Socket.dev"
    },
    "codbro-dxp.explorer-xml-xquery": {
        "campaign": "wave-5",
        "source": "Socket.dev"
    },
    "codbroks.compile-runnner-extension": {
        "campaign": "wave-5",
        "source": "Koi Security"
    },
    "codeinklingon.git-worktree-menu": {
        "campaign": "wave-1",
        "source": "Koi Security"
    },
    "codejoy.codejoy-vscode-extension": {
        "campaign": "wave-1",
        "source": "Koi Security"
    },
    "codevsce.codelddb-vscode": {
        "campaign": "wave-3",
        "source": "Koi Security"
    },
    "codevunm-tm.cluster-kuberntes-manager": {
        "campaign": "wave-5",
        "source": "Socket.dev"
    },
    "codevunmis.csv-sql-tsv-rainbow": {
        "campaign": "wave-5",
        "source": "Koi Security"
    },
    "codwayexten.code-way-extension": {
        "campaign": "wave-5",
        "source": "Koi Security"
    },
    "coneditorfig.config-editor-extension": {
        "campaign": "glassworm-v2",
        "source": "Socket.dev"
    },
    "configcat.configcat-feature-flags": {
        "campaign": "evil-twin",
        "source": "Manifold Security"
    },
    "cosmic-themes.sql-formatter": {
        "campaign": "wave-5",
        "source": "Koi Security"
    },
    "countrepresent49.code-image-preview": {
        "campaign": "sleeper-73",
        "source": "Socket.dev"
    },
    "craz2team.vscode-todo-extension": {
        "campaign": "wave-5",
        "source": "Socket.dev"
    },
    "crazy-ndkilddmn.vim-smart-tool": {
        "campaign": "glassworm-v2",
        "source": "Socket.dev"
    },
    "croct-studio.antigravity-model-usage-dashboard": {
        "campaign": "wave-5",
        "source": "Socket.dev"
    },
    "crotoapp.vscode-xml-extension": {
        "campaign": "wave-5",
        "source": "Koi Security"
    },
    "csvmech.csv-sql-tsv-rainbow": {
        "campaign": "wave-3",
        "source": "Koi Security"
    },
    "csvmech.csvrainbow": {
        "campaign": "wave-3",
        "source": "Koi Security"
    },
    "cubedivervolt.html-code-validate": {
        "campaign": "sleeper-73",
        "source": "Socket.dev"
    },
    "cud-dot-prod-studio.prettier-pro-vscode-extension": {
        "campaign": "glassworm-v2",
        "source": "Socket.dev"
    },
    "cudra-production.vsce-prettier-pro": {
        "campaign": "wave-4",
        "source": "Koi Security"
    },
    "cweijamysq.sync-settings-vscode": {
        "campaign": "wave-3",
        "source": "Koi Security"
    },
    "daeumer-web.align-format-tool": {
        "campaign": "wave-5",
        "source": "Socket.dev"
    },
    "daeumer-web.es-linter-for-vs-code": {
        "campaign": "wave-5",
        "source": "Koi Security"
    },
    "daeumer-web.style-align-extension": {
        "campaign": "glassworm-v2",
        "source": "Socket.dev"
    },
    "dalsoven.intellij-live-pilot": {
        "campaign": "sleeper-73",
        "source": "Socket.dev"
    },
    "dalsovik.dbclient-quick-suite": {
        "campaign": "sleeper-73",
        "source": "Socket.dev"
    },
    "danlambiase.lmstudio-copilot-provider": {
        "campaign": "solana-may-2026",
        "source": "Yeeth Security"
    },
    "dark-code-studio.flutter-extension": {
        "campaign": "wave-5",
        "source": "Koi Security"
    },
    "dart-vsc.code-dart": {
        "campaign": "wave-3",
        "source": "Koi Security"
    },
    "davidpallinder.rails-test-runner": {
        "campaign": "evil-twin",
        "source": "Manifold Security"
    },
    "denizhandaklr.copilot-vscode-deepseek": {
        "campaign": "solana-may-2026",
        "source": "Yeeth Security"
    },
    "densy-little-studio.wonder-for-vscode-icons": {
        "campaign": "wave-5",
        "source": "Koi Security"
    },
    "dep-labs-studio.dep-proffesinal-extension": {
        "campaign": "wave-5",
        "source": "Koi Security"
    },
    "dev-studio-sense.php-comp-tools-vscode": {
        "campaign": "wave-5",
        "source": "Koi Security"
    },
    "dev-tm.code-python-indent-helper": {
        "campaign": "wave-5",
        "source": "Socket.dev"
    },
    "devmidu-studio.svg-better-extension": {
        "campaign": "wave-5",
        "source": "Koi Security"
    },
    "doi.fileheadercomment": {
        "campaign": "evil-twin",
        "source": "Manifold Security"
    },
    "dopbop-studio.vscode-tailwindcss-extension-toolkit": {
        "campaign": "wave-5",
        "source": "Koi Security"
    },
    "draconzal.phpstan-easy-hub": {
        "campaign": "sleeper-73",
        "source": "Socket.dev"
    },
    "dranaven.flask-live-craft": {
        "campaign": "sleeper-73",
        "source": "Socket.dev"
    },
    "drewbourne.vscode-remark-lint": {
        "campaign": "evil-twin",
        "source": "Manifold Security"
    },
    "drobnyak.angular-auto-helper": {
        "campaign": "sleeper-73",
        "source": "Socket.dev"
    },
    "drovenko.data-live-suite": {
        "campaign": "sleeper-73",
        "source": "Socket.dev"
    },
    "eamodas.shiny-vscode": {
        "campaign": "wave-3",
        "source": "Koi Security"
    },
    "edenlabio.fhir-profiler-tool": {
        "campaign": "evil-twin-apee",
        "source": "Yeeth Security"
    },
    "ellacrity.recoil": {
        "campaign": "wave-1",
        "source": "Koi Security"
    },
    "emilerolley.publicodes-language-server": {
        "campaign": "evil-twin-apee",
        "source": "Yeeth Security"
    },
    "emotionkyoseparate.turkish-language-pack": {
        "campaign": "sleeper-73",
        "source": "Socket.dev"
    },
    "epichipporedeem.prettier-eslint-formatter": {
        "campaign": "sleeper-73",
        "source": "Socket.dev"
    },
    "errlenscre.error-lens-finder-ex": {
        "campaign": "wave-5",
        "source": "Koi Security"
    },
    "escalion.create-react-component": {
        "campaign": "solana-may-2026",
        "source": "Yeeth Security"
    },
    "exargd.vsblack": {
        "campaign": "wasm-jun-2026",
        "source": "Socket.dev + Yeeth Security"
    },
    "exss-studio.yaml-professional-extension": {
        "campaign": "wave-5",
        "source": "Koi Security"
    },
    "faldenko.explorer-auto-hub": {
        "campaign": "sleeper-73",
        "source": "Socket.dev"
    },
    "federicanc.dotenv-syntax-highlighting": {
        "campaign": "wave-5",
        "source": "Koi Security"
    },
    "federicanc.envglow-syntax-highlighting": {
        "campaign": "glassworm-v2",
        "source": "Socket.dev"
    },
    "finlay-ab.vscode-latex-runner": {
        "campaign": "solana-may-2026",
        "source": "Yeeth Security"
    },
    "flape-osx.align-code-format-tool": {
        "campaign": "wave-5",
        "source": "Socket.dev"
    },
    "floktokbok.autoimport": {
        "campaign": "wave-2026",
        "source": "Aikido"
    },
    "floktokbok.autoimport-smart-tool": {
        "campaign": "wave-5",
        "source": "Socket.dev"
    },
    "flutcode.flutter-extension": {
        "campaign": "wave-3",
        "source": "Koi Security"
    },
    "flutterando.flutter-mobx": {
        "campaign": "evil-twin",
        "source": "Manifold Security"
    },
    "flutxvs.vscode-kuberntes-extension": {
        "campaign": "wave-5",
        "source": "Koi Security"
    },
    "forkelbat.supersigil-rich-hub": {
        "campaign": "sleeper-73",
        "source": "Socket.dev"
    },
    "frelovin.gitpod-deep-helper": {
        "campaign": "sleeper-73",
        "source": "Socket.dev"
    },
    "fyltroven.gitchat-fast-tool": {
        "campaign": "sleeper-73",
        "source": "Socket.dev"
    },
    "galushko.vsclassic-auto-pilot": {
        "campaign": "sleeper-73",
        "source": "Socket.dev"
    },
    "garaemon.vscode-emacs-tab": {
        "campaign": "evil-twin",
        "source": "Manifold Security"
    },
    "gastholve.shell-pro-kit": {
        "campaign": "sleeper-73",
        "source": "Socket.dev"
    },
    "gematikde.codfsh": {
        "campaign": "evil-twin-apee",
        "source": "Yeeth Security"
    },
    "ghaschel.vscode-angular-html": {
        "campaign": "evil-twin-apee",
        "source": "Yeeth Security"
    },
    "ginfuru.better-nunjucks": {
        "campaign": "wave-1",
        "source": "Koi Security"
    },
    "glavin001.unibeautify-vscode": {
        "campaign": "evil-twin",
        "source": "Manifold Security"
    },
    "gobystrokreactjs.gobystrok": {
        "campaign": "evil-twin",
        "source": "Manifold Security"
    },
    "goltikov.auto-rich-forge": {
        "campaign": "sleeper-73",
        "source": "Socket.dev"
    },
    "gonzooo.aurora-gonz": {
        "campaign": "wasm-jun-2026",
        "source": "Yeeth Security"
    },
    "gorth-tm.your-project-manager-organizer": {
        "campaign": "wave-5",
        "source": "Socket.dev"
    },
    "grisaven.markdown-live-kit": {
        "campaign": "sleeper-73",
        "source": "Socket.dev"
    },
    "groksrc.ruby": {
        "campaign": "evil-twin",
        "source": "Manifold Security"
    },
    "gronarin.auto-super-kit": {
        "campaign": "sleeper-73",
        "source": "Socket.dev"
    },
    "grozdarov.jinjahtml-easy-studio": {
        "campaign": "sleeper-73",
        "source": "Socket.dev"
    },
    "grrrck.positron-plus-1-e": {
        "campaign": "wave-1",
        "source": "Koi Security"
    },
    "gusarev.mermaid-super-studio": {
        "campaign": "sleeper-73",
        "source": "Socket.dev"
    },
    "gvotcha.claude-code-extension": {
        "campaign": "wave-5",
        "source": "Koi Security"
    },
    "gvotcha.claude-code-extensions": {
        "campaign": "wave-5",
        "source": "Koi Security"
    },
    "haelthorn.fractal-fast-studio": {
        "campaign": "sleeper-73",
        "source": "Socket.dev"
    },
    "hanifmifta.adocs": {
        "campaign": "evil-twin-apee",
        "source": "Yeeth Security"
    },
    "helixquar.asciidecorator": {
        "campaign": "evil-twin",
        "source": "Manifold Security"
    },
    "hyperledgercomposer.composer-support-client": {
        "campaign": "evil-twin",
        "source": "Manifold Security"
    },
    "icepower1997.glacier-cave-theme": {
        "campaign": "glassworm-v2",
        "source": "Socket.dev"
    },
    "iconkief.icon-theme-material": {
        "campaign": "wave-3",
        "source": "Koi Security"
    },
    "iconkieftwo.icon-theme-materiall": {
        "campaign": "wave-3",
        "source": "Koi Security"
    },
    "ilvvilab.php-composr-tool-extension": {
        "campaign": "glassworm-v2",
        "source": "Socket.dev"
    },
    "inangalek.project-manager-extension": {
        "campaign": "glassworm-v2",
        "source": "Socket.dev"
    },
    "insigne.powershell": {
        "campaign": "evil-twin",
        "source": "Manifold Security"
    },
    "intellipro.extension-json-intelligence": {
        "campaign": "wave-5",
        "source": "Koi Security"
    },
    "iotaledger.iota-move": {
        "campaign": "evil-twin",
        "source": "Manifold Security"
    },
    "ishantgupta777.pipfi-code-share": {
        "campaign": "solana-may-2026",
        "source": "Yeeth Security"
    },
    "istornz.koby": {
        "campaign": "wasm-jun-2026",
        "source": "Yeeth Security"
    },
    "jakeboone02.cypher-query-language": {
        "campaign": "evil-twin",
        "source": "Manifold Security"
    },
    "jcamp.dotnet-test-provider-view": {
        "campaign": "evil-twin",
        "source": "Manifold Security"
    },
    "jeremy38100.init-node-script": {
        "campaign": "evil-twin",
        "source": "Manifold Security"
    },
    "jeronimo-self-dev.smart-color-picker": {
        "campaign": "glassworm-v2",
        "source": "Socket.dev"
    },
    "jeronimoekerdt.color-picker-universal": {
        "campaign": "wave-1",
        "source": "Koi Security"
    },
    "jkiviluoto.tws": {
        "campaign": "evil-twin-apee",
        "source": "Yeeth Security"
    },
    "joaompfp.hermes-ai-agent": {
        "campaign": "solana-may-2026",
        "source": "Yeeth Security"
    },
    "jscearcy.rust-doc-viewer": {
        "campaign": "wave-1",
        "source": "Koi Security"
    },
    "jt.jakt": {
        "campaign": "evil-twin",
        "source": "Manifold Security"
    },
    "jupstudio.dotenv-tools-dev": {
        "campaign": "glassworm-v2",
        "source": "Socket.dev"
    },
    "juptool.jupyter-pro-tool-extension": {
        "campaign": "glassworm-v2",
        "source": "Socket.dev"
    },
    "kaellarkin.hugo-shortcode-syntax": {
        "campaign": "evil-twin",
        "source": "Manifold Security"
    },
    "kalinka.shellcheck-auto-craft": {
        "campaign": "glassworm-v2",
        "source": "Socket.dev"
    },
    "karnenko.cursorless-pro-pilot": {
        "campaign": "sleeper-73",
        "source": "Socket.dev"
    },
    "karnikov.better-rich-studio": {
        "campaign": "sleeper-73",
        "source": "Socket.dev"
    },
    "keltarin.android-deep-hub": {
        "campaign": "sleeper-73",
        "source": "Socket.dev"
    },
    "keyacrosslaud.auto-loop-for-antigravity": {
        "campaign": "sleeper-73",
        "source": "Socket.dev"
    },
    "kharizma.vscode-extension-wakatime": {
        "campaign": "wave-5",
        "source": "Koi Security"
    },
    "khromok.react-deep-tool": {
        "campaign": "glassworm-v2",
        "source": "Socket.dev"
    },
    "kleinesfilmroellchen.serenity-dsl-syntaxhighlight": {
        "campaign": "wave-1",
        "source": "Koi Security"
    },
    "klustfix.kluster-code-verify": {
        "campaign": "wave-3",
        "source": "Koi Security"
    },
    "kmsbofoxpf.fcrhyhewjv": {
        "campaign": "wasm-jun-2026",
        "source": "Yeeth Security"
    },
    "ko-zu-gun-studio.synchronization-settings-vscode": {
        "campaign": "wave-5",
        "source": "Koi Security"
    },
    "kotpot.modern-css-toolkit": {
        "campaign": "glassworm-v2",
        "source": "Socket.dev"
    },
    "krosarin.npm-fast-studio": {
        "campaign": "sleeper-73",
        "source": "Socket.dev"
    },
    "krosaven.dot-live-forge": {
        "campaign": "sleeper-73",
        "source": "Socket.dev"
    },
    "krosovik.laravel-quick-pilot": {
        "campaign": "sleeper-73",
        "source": "Socket.dev"
    },
    "krundoven.ironplc-fast-hub": {
        "campaign": "sleeper-73",
        "source": "Socket.dev"
    },
    "kuldaran.search-smart-forge": {
        "campaign": "sleeper-73",
        "source": "Socket.dev"
    },
    "kwinsolin.act-extension": {
        "campaign": "glassworm-v2",
        "source": "Socket.dev"
    },
    "kwinsolin.better-cpp-tool": {
        "campaign": "glassworm-v2",
        "source": "Socket.dev"
    },
    "kwitch-studio.auto-run-command-extension": {
        "campaign": "wave-5",
        "source": "Koi Security"
    },
    "l-igh-t.vscode-theme-seti-folder": {
        "campaign": "wave-1",
        "source": "Koi Security"
    },
    "lairinspectortrek70.todo-highlighter": {
        "campaign": "sleeper-73",
        "source": "Socket.dev"
    },
    "lauracode.wrap-selected-code": {
        "campaign": "wave-5",
        "source": "Socket.dev"
    },
    "lavender-studio.theme-lavender-dreams": {
        "campaign": "wave-5",
        "source": "Koi Security"
    },
    "lavrentev.project-live-studio": {
        "campaign": "sleeper-73",
        "source": "Socket.dev"
    },
    "lego-education.ev3-micropython": {
        "campaign": "evil-twin",
        "source": "Manifold Security"
    },
    "lesnitsky.tikbook-easy-lens": {
        "campaign": "sleeper-73",
        "source": "Socket.dev"
    },
    "levertion.mcjson": {
        "campaign": "evil-twin",
        "source": "Manifold Security"
    },
    "littensy-studio.magical-icons": {
        "campaign": "wave-5",
        "source": "Koi Security"
    },
    "ll-service-vm-studio.vscode-clangd-cross-platform": {
        "campaign": "glassworm-v2",
        "source": "Socket.dev"
    },
    "long-kudo.vscode-claude-status": {
        "campaign": "solana-may-2026",
        "source": "Yeeth Security"
    },
    "luongnd.edge": {
        "campaign": "evil-twin-apee",
        "source": "Yeeth Security"
    },
    "lyu-wen-studio-web-han.better-formatter-vscode": {
        "campaign": "wave-5",
        "source": "Koi Security"
    },
    "lyywemhan.code-formatter-and-minifier-vscode": {
        "campaign": "wave-3",
        "source": "Koi Security"
    },
    "madhavd1.javadoc-tools": {
        "campaign": "evil-twin",
        "source": "Manifold Security"
    },
    "magne-sjaastad.opm-flow-editor-support": {
        "campaign": "evil-twin",
        "source": "Manifold Security"
    },
    "manageblox.manageblox": {
        "campaign": "roblox-dropper-heyheyhey",
        "source": "Yeeth Security"
    },
    "maptz.regionfolder": {
        "campaign": "evil-twin",
        "source": "Manifold Security"
    },
    "marabenov.graphql-super-craft": {
        "campaign": "sleeper-73",
        "source": "Socket.dev"
    },
    "marcus-tm.ruby-intelligence-toolkit": {
        "campaign": "wave-5",
        "source": "Socket.dev"
    },
    "marinhobrandao.angular2tests": {
        "campaign": "evil-twin",
        "source": "Manifold Security"
    },
    "marketplace.visualstudio": {
        "campaign": "evil-twin",
        "source": "Manifold Security"
    },
    "markvalid.vscode-mdvalidator-extension": {
        "campaign": "wave-5",
        "source": "Koi Security"
    },
    "martyev.turbo-deep-tool": {
        "campaign": "glassworm-v2",
        "source": "Socket.dev"
    },
    "mashulin.vue-easy-studio": {
        "campaign": "sleeper-73",
        "source": "Socket.dev"
    },
    "mccprogrammer.debug-datastructures-visualizer-extension": {
        "campaign": "solana-may-2026",
        "source": "Yeeth Security"
    },
    "mecreation-studio.pyrefly-pro-extension": {
        "campaign": "wave-5",
        "source": "Koi Security"
    },
    "meldarin.biome-live-tool": {
        "campaign": "sleeper-73",
        "source": "Socket.dev"
    },
    "meltovik.bookmark-rich-tool": {
        "campaign": "sleeper-73",
        "source": "Socket.dev"
    },
    "meltuven.graphql-pro-tool": {
        "campaign": "sleeper-73",
        "source": "Socket.dev"
    },
    "mengsicode.vscode-django-boilerplate": {
        "campaign": "evil-twin",
        "source": "Manifold Security"
    },
    "miclo.sort-typescript-imports": {
        "campaign": "evil-twin",
        "source": "Manifold Security"
    },
    "microsoft-dciborow.align-bicep": {
        "campaign": "evil-twin",
        "source": "Manifold Security"
    },
    "mitre-health.vscode-language-fsh": {
        "campaign": "evil-twin-apee",
        "source": "Yeeth Security"
    },
    "mitrokhin.vsc-easy-studio": {
        "campaign": "sleeper-73",
        "source": "Socket.dev"
    },
    "mitsuhiko.insta": {
        "campaign": "evil-twin",
        "source": "Manifold Security"
    },
    "mkdirdocs.mkd-docs": {
        "campaign": "evil-twin",
        "source": "Manifold Security"
    },
    "mlechevik.nunjucks-rich-pilot": {
        "campaign": "sleeper-73",
        "source": "Socket.dev"
    },
    "mokridin.material-pro-suite": {
        "campaign": "sleeper-73",
        "source": "Socket.dev"
    },
    "move.move-analyzer": {
        "campaign": "evil-twin",
        "source": "Manifold Security"
    },
    "mrekelid.manpages-fast-kit": {
        "campaign": "sleeper-73",
        "source": "Socket.dev"
    },
    "msjsdreact.react-native-vsce": {
        "campaign": "wave-3",
        "source": "Koi Security"
    },
    "msjsdreact.react-native-vscode": {
        "campaign": "wave-3",
        "source": "Koi Security"
    },
    "msw-tm.component-vetur-toolkit": {
        "campaign": "wave-5",
        "source": "Socket.dev"
    },
    "mswincx.antigravity-cockpit": {
        "campaign": "wave-5",
        "source": "Koi Security"
    },
    "mswincx.antigravity-cockpit-extension": {
        "campaign": "wave-5",
        "source": "Koi Security"
    },
    "mukundan.python-docs": {
        "campaign": "evil-twin",
        "source": "Manifold Security"
    },
    "myexttool.my-command-palette-extension": {
        "campaign": "glassworm-v2",
        "source": "Socket.dev"
    },
    "myml.vscode-markdown-plantuml-preview": {
        "campaign": "incident-local-suspicious-recommendation",
        "source": "this incident (planted via .vscode/extensions.json)"
    },
    "namop-dex.claude-code-assistant": {
        "campaign": "wave-5",
        "source": "Socket.dev"
    },
    "namopins.prettier-pro-vscode-extension": {
        "campaign": "wave-5",
        "source": "Koi Security"
    },
    "nazarov.errorlens-fast-suite": {
        "campaign": "glassworm-v2",
        "source": "Socket.dev"
    },
    "nhunter0.dll-structure-viewer": {
        "campaign": "solana-may-2026",
        "source": "Yeeth Security"
    },
    "nihilus118.perl-debugger": {
        "campaign": "evil-twin",
        "source": "Manifold Security"
    },
    "noellee-doc.flint-debug": {
        "campaign": "wasm-jun-2026",
        "source": "Socket.dev + Yeeth Security"
    },
    "npxms.hide-gitignored": {
        "campaign": "evil-twin",
        "source": "Manifold Security"
    },
    "obyte.oscript-vscode-plugin": {
        "campaign": "evil-twin",
        "source": "Manifold Security"
    },
    "oigotm.my-command-palette-extension": {
        "campaign": "wave-5",
        "source": "Koi Security"
    },
    "oldjobobo.retro-82-theme": {
        "campaign": "solana-may-2026",
        "source": "Yeeth Security"
    },
    "oldjrzobobo.miasma-theme": {
        "campaign": "solana-may-2026",
        "source": "Yeeth Security"
    },
    "oorzc.i18n-tools-plus": {
        "campaign": "oorzc-account-compromise-jan-2026",
        "source": "Socket.dev"
    },
    "oorzc.mind-map": {
        "campaign": "oorzc-account-compromise-jan-2026",
        "source": "Socket.dev"
    },
    "oorzc.scss-to-css-compile": {
        "campaign": "oorzc-account-compromise-jan-2026",
        "source": "Socket.dev"
    },
    "oorzc.ssh-tools": {
        "campaign": "oorzc-account-compromise-jan-2026",
        "source": "Socket.dev"
    },
    "openeuphoria.vscode-euphoria": {
        "campaign": "evil-twin",
        "source": "Manifold Security"
    },
    "oss.sfmc-devtools-vscode": {
        "campaign": "evil-twin",
        "source": "Manifold Security"
    },
    "otobo-vs.csv-query-tsv-rainbow": {
        "campaign": "wave-5",
        "source": "Socket.dev"
    },
    "otoboss.autoimport-extension": {
        "campaign": "wave-5",
        "source": "Koi Security"
    },
    "outsidestormcommand.monochromator-theme": {
        "campaign": "sleeper-73",
        "source": "Socket.dev"
    },
    "ovchinin.markdown-live-craft": {
        "campaign": "sleeper-73",
        "source": "Socket.dev"
    },
    "ovixcode.vscode-better-comments": {
        "campaign": "wave-5",
        "source": "Koi Security"
    },
    "oxigener-tmp.sql-turbo-manager": {
        "campaign": "wave-5",
        "source": "Socket.dev"
    },
    "pdragon.azure-rbs-workbench": {
        "campaign": "solana-may-2026",
        "source": "Yeeth Security"
    },
    "peldravix.rpgiv2free-live-tool": {
        "campaign": "sleeper-73",
        "source": "Socket.dev"
    },
    "peschanov.dbcode-smart-suite": {
        "campaign": "sleeper-73",
        "source": "Socket.dev"
    },
    "pessa07tm.my-js-ts-auto-commands": {
        "campaign": "wave-5",
        "source": "Koi Security"
    },
    "platarov.podmanager-pro-craft": {
        "campaign": "sleeper-73",
        "source": "Socket.dev"
    },
    "polikash.pretty-deep-kit": {
        "campaign": "sleeper-73",
        "source": "Socket.dev"
    },
    "porzhnev.swiftformat-deep-hub": {
        "campaign": "sleeper-73",
        "source": "Socket.dev"
    },
    "potstok.dotnet-runtime-extension": {
        "campaign": "wave-5",
        "source": "Koi Security"
    },
    "pranlokev.topmodel-fast-suite": {
        "campaign": "sleeper-73",
        "source": "Socket.dev"
    },
    "prednovik.php-super-pilot": {
        "campaign": "sleeper-73",
        "source": "Socket.dev"
    },
    "prettier-vsc.vsce-prettier": {
        "campaign": "wave-3",
        "source": "Koi Security"
    },
    "pretty-studio-advisor.prettyxml-formatter": {
        "campaign": "wave-5",
        "source": "Koi Security"
    },
    "prisma-inc.prisma-studio-assistance": {
        "campaign": "wave-3",
        "source": "Koi Security"
    },
    "prismapp.prisma-vs-code-extension": {
        "campaign": "wave-5",
        "source": "Koi Security"
    },
    "projmanager.your-project-manager-extension": {
        "campaign": "wave-5",
        "source": "Koi Security"
    },
    "pubruncode.ccoderunner": {
        "campaign": "wave-5",
        "source": "Koi Security"
    },
    "puccin-development.full-access-catppuccin-pro-extension": {
        "campaign": "wave-4",
        "source": "Koi Security"
    },
    "pulselireckon.code-usage-stats": {
        "campaign": "glassworm-v2",
        "source": "Socket.dev"
    },
    "pwrs.cem-language-server-vscode": {
        "campaign": "evil-twin",
        "source": "Manifold Security"
    },
    "pyflowpyr.py-flowpyright-extension": {
        "campaign": "wave-5",
        "source": "Koi Security"
    },
    "pyscopexte.pyscope-extension": {
        "campaign": "wave-5",
        "source": "Koi Security"
    },
    "qiu.llvm-ir-language-support": {
        "campaign": "evil-twin",
        "source": "Manifold Security"
    },
    "qizhao.element-vue-snippets": {
        "campaign": "wasm-jun-2026",
        "source": "Yeeth Security"
    },
    "quartz.quartz-markdown-editor": {
        "campaign": "wave-5",
        "source": "Koi Security"
    },
    "quickrunn.auto-run-command-quick": {
        "campaign": "wave-5",
        "source": "Socket.dev"
    },
    "randevtek-dev.extension-thunder-client-free": {
        "campaign": "glassworm-v2",
        "source": "Socket.dev"
    },
    "razinov.spell-rich-hub": {
        "campaign": "glassworm-v2",
        "source": "Socket.dev"
    },
    "redcapcollective.vscode-quarkus-elite-suite": {
        "campaign": "wave-5",
        "source": "Koi Security"
    },
    "reditorsupporter.r-vscode": {
        "campaign": "glassworm-v2",
        "source": "Socket.dev"
    },
    "redmat.vscode-quarkus-pro": {
        "campaign": "wave-3",
        "source": "Koi Security"
    },
    "rocontrol.rocontrol": {
        "campaign": "roblox-dropper-heyheyhey",
        "source": "Yeeth Security"
    },
    "roflow.roflow": {
        "campaign": "roblox-dropper-heyheyhey",
        "source": "Yeeth Security"
    },
    "ropilot.ropilot": {
        "campaign": "roblox-dropper-heyheyhey",
        "source": "Yeeth Security"
    },
    "roplanner.roplanner": {
        "campaign": "roblox-dropper-heyheyhey",
        "source": "Yeeth Security"
    },
    "rotasker.rotasker": {
        "campaign": "roblox-dropper-heyheyhey",
        "source": "Yeeth Security"
    },
    "rubyideext.ruby-ide-extension": {
        "campaign": "wave-5",
        "source": "Koi Security"
    },
    "rumbledb.jsoniq-vscode": {
        "campaign": "evil-twin",
        "source": "Manifold Security"
    },
    "runnerpost.runner-your-code": {
        "campaign": "wave-5",
        "source": "Koi Security"
    },
    "rusakov.indent-quick-pilot": {
        "campaign": "glassworm-v2",
        "source": "Socket.dev"
    },
    "ruslanmv.gitpilot-vscode": {
        "campaign": "solana-may-2026",
        "source": "Yeeth Security"
    },
    "saoudrizvsce.claude-dev": {
        "campaign": "wave-3",
        "source": "Koi Security"
    },
    "saoudrizvsce.claude-devsce": {
        "campaign": "wave-3",
        "source": "Koi Security"
    },
    "sbsnippets.pytorch-snippets": {
        "campaign": "evil-twin",
        "source": "Manifold Security"
    },
    "seldovik.cmake-smart-pilot": {
        "campaign": "sleeper-73",
        "source": "Socket.dev"
    },
    "sfqkrvjrtl.prdoypxjbi": {
        "campaign": "wasm-jun-2026",
        "source": "Yeeth Security"
    },
    "shinypy.pycode-formatter": {
        "campaign": "sleeper-73",
        "source": "Socket.dev"
    },
    "shinypy.shiny-extension-for-vscode": {
        "campaign": "wave-5",
        "source": "Koi Security"
    },
    "shiverov.open-smart-suite": {
        "campaign": "sleeper-73",
        "source": "Socket.dev"
    },
    "shulgin.deno-rich-lens": {
        "campaign": "glassworm-v2",
        "source": "Socket.dev"
    },
    "silvia68.console-log-generator": {
        "campaign": "glassworm-v2",
        "source": "Socket.dev"
    },
    "singularityinc.claude-notifier": {
        "campaign": "solana-may-2026",
        "source": "Yeeth Security"
    },
    "sirilmp.dark-theme-sm": {
        "campaign": "wave-1",
        "source": "Koi Security"
    },
    "sissel.shopify-liquid": {
        "campaign": "wave-1",
        "source": "Koi Security"
    },
    "skorzenko.office-deep-studio": {
        "campaign": "sleeper-73",
        "source": "Socket.dev"
    },
    "skypfrain.vs-cc-switch": {
        "campaign": "solana-may-2026",
        "source": "Yeeth Security"
    },
    "slb235.vscode-coffeelint": {
        "campaign": "evil-twin",
        "source": "Manifold Security"
    },
    "smolyak.slog-smart-studio": {
        "campaign": "sleeper-73",
        "source": "Socket.dev"
    },
    "sol-studio.solidity-extension": {
        "campaign": "wave-5",
        "source": "Koi Security"
    },
    "solblanco.svelte-vscode": {
        "campaign": "wave-3",
        "source": "Koi Security"
    },
    "solblanco.svetle-vsce": {
        "campaign": "wave-3",
        "source": "Koi Security"
    },
    "spacesalamanderhook.italian-language-pack": {
        "campaign": "sleeper-73",
        "source": "Socket.dev"
    },
    "spacetoow.vsc-python-indent": {
        "campaign": "wave-5",
        "source": "Socket.dev"
    },
    "specstudio.code-wakatime-activity-tracker": {
        "campaign": "wave-5",
        "source": "Socket.dev"
    },
    "spikearshock.csv-rainbow": {
        "campaign": "sleeper-73",
        "source": "Socket.dev"
    },
    "srcery-colors.srcery-colors": {
        "campaign": "wave-1",
        "source": "Koi Security"
    },
    "sremekov.javascriptsnippets-rich-craft": {
        "campaign": "sleeper-73",
        "source": "Socket.dev"
    },
    "sremovik.dendron-deep-hub": {
        "campaign": "sleeper-73",
        "source": "Socket.dev"
    },
    "sremuven.beautify-super-lens": {
        "campaign": "sleeper-73",
        "source": "Socket.dev"
    },
    "ssagov.uef-snippets": {
        "campaign": "evil-twin",
        "source": "Manifold Security"
    },
    "ssgwysc.volar-vscode": {
        "campaign": "wave-5",
        "source": "Koi Security"
    },
    "stackmason1.synesthesia-theme": {
        "campaign": "glassworm-v2",
        "source": "Socket.dev"
    },
    "stadiumgripier.vscode-onedark-theme": {
        "campaign": "sleeper-73",
        "source": "Socket.dev"
    },
    "starodub.kodio-smart-forge": {
        "campaign": "glassworm-v2",
        "source": "Socket.dev"
    },
    "stelbavik.hledger-fast-tool": {
        "campaign": "sleeper-73",
        "source": "Socket.dev"
    },
    "stormier.vue-dsfr-snippets": {
        "campaign": "evil-twin-apee",
        "source": "Yeeth Security"
    },
    "studio-jja-laire.quarto-advanced-suite": {
        "campaign": "glassworm-v2",
        "source": "Socket.dev"
    },
    "studio-jjalaire-team.professional-quarto-extension": {
        "campaign": "wave-5",
        "source": "Koi Security"
    },
    "studio-velte-distributor.pro-svelte-extension": {
        "campaign": "wave-4",
        "source": "Koi Security"
    },
    "sun-shine-studio.shiny-extension-for-vscode": {
        "campaign": "wave-5",
        "source": "Koi Security"
    },
    "superdoc-dev.superdoc-vscode-ext": {
        "campaign": "solana-may-2026",
        "source": "Yeeth Security"
    },
    "superneentrance.peacock-colors": {
        "campaign": "sleeper-73",
        "source": "Socket.dev"
    },
    "superposition.supertoml-analyzer": {
        "campaign": "evil-twin",
        "source": "Manifold Security"
    },
    "sv-codex.gitlens-code-history-explorer": {
        "campaign": "glassworm-v2",
        "source": "Socket.dev"
    },
    "svetelin.industrious-live-hub": {
        "campaign": "sleeper-73",
        "source": "Socket.dev"
    },
    "svltsweet.svetle-for-cursor": {
        "campaign": "wave-3",
        "source": "Koi Security"
    },
    "sweaty-toys-stuios.extension-volar-tool-kit": {
        "campaign": "glassworm-v2",
        "source": "Socket.dev"
    },
    "sweaty-tstudio.quarto-report-studio": {
        "campaign": "wave-5",
        "source": "Socket.dev"
    },
    "sxatvo-tm.compile-runnner-build": {
        "campaign": "wave-5",
        "source": "Socket.dev"
    },
    "sxatvo.jinja-extension": {
        "campaign": "wave-5",
        "source": "Koi Security"
    },
    "syndakove.todo4vcode-quick-suite": {
        "campaign": "sleeper-73",
        "source": "Socket.dev"
    },
    "tagovich.zener-pro-craft": {
        "campaign": "sleeper-73",
        "source": "Socket.dev"
    },
    "tailwind-nuxt.tailwindcss-for-react": {
        "campaign": "wave-3",
        "source": "Koi Security"
    },
    "tamokill12.foundry-pdf-extension": {
        "campaign": "wave-5",
        "source": "Koi Security"
    },
    "tamokill12.pdf-extension": {
        "campaign": "glassworm-v2",
        "source": "Socket.dev"
    },
    "tamuratak.vscode-lezer": {
        "campaign": "evil-twin",
        "source": "Manifold Security"
    },
    "tarasenya.todo-rich-hub": {
        "campaign": "sleeper-73",
        "source": "Socket.dev"
    },
    "taskfile.vscode-task": {
        "campaign": "evil-twin",
        "source": "Manifold Security"
    },
    "tettetrouse0t.geode-amethyst-theme": {
        "campaign": "glassworm-v2",
        "source": "Socket.dev"
    },
    "tgreen7.vs-code-node-require": {
        "campaign": "evil-twin",
        "source": "Manifold Security"
    },
    "thing-mn.your-flow-extension-for-icons": {
        "campaign": "wave-5",
        "source": "Koi Security"
    },
    "thunderprosecutor.autopep8-formatter": {
        "campaign": "sleeper-73",
        "source": "Socket.dev"
    },
    "thykka.superpowers": {
        "campaign": "solana-may-2026",
        "source": "Yeeth Security"
    },
    "tima-web-wang.shell-check-utils": {
        "campaign": "wave-5",
        "source": "Koi Security"
    },
    "tokcodes.import-cost-extension": {
        "campaign": "wave-5",
        "source": "Koi Security"
    },
    "tool-studio.prettier-pro-code-format": {
        "campaign": "wave-5",
        "source": "Socket.dev"
    },
    "toowespace.worksets-extension": {
        "campaign": "wave-5",
        "source": "Koi Security"
    },
    "tormekov.htmlmustache-fast-craft": {
        "campaign": "sleeper-73",
        "source": "Socket.dev"
    },
    "tossbers.browser-open-tool": {
        "campaign": "sleeper-73",
        "source": "Socket.dev"
    },
    "tralarin.firefox-rich-lens": {
        "campaign": "sleeper-73",
        "source": "Socket.dev"
    },
    "tralaven.c-easy-tool": {
        "campaign": "sleeper-73",
        "source": "Socket.dev"
    },
    "treedotree.tree-do-todoextension": {
        "campaign": "wave-5",
        "source": "Koi Security"
    },
    "trenarin.autodocstring-auto-studio": {
        "campaign": "sleeper-73",
        "source": "Socket.dev"
    },
    "tretinv3.forts-api-extention": {
        "campaign": "wave-1",
        "source": "Koi Security"
    },
    "trikarin.database-super-tool": {
        "campaign": "sleeper-73",
        "source": "Socket.dev"
    },
    "trovizno.arko-extension": {
        "campaign": "glassworm-v2",
        "source": "Socket.dev"
    },
    "tucyzirille-studio.angular-pro-tools-extension": {
        "campaign": "wave-5",
        "source": "Koi Security"
    },
    "turbobase.sql-turbo-tool": {
        "campaign": "wave-5",
        "source": "Koi Security"
    },
    "twilkbilk.color-highlight-css": {
        "campaign": "wave-5",
        "source": "Koi Security"
    },
    "uavcan.dsdl": {
        "campaign": "evil-twin",
        "source": "Manifold Security"
    },
    "vadim-studio-cn.extension-lldb-pro-vscode": {
        "campaign": "glassworm-v2",
        "source": "Socket.dev"
    },
    "vce-brendan-studio-eich.js-debuger-vscode": {
        "campaign": "wave-5",
        "source": "Koi Security"
    },
    "vegamo.deepcode-vscode": {
        "campaign": "solana-may-2026",
        "source": "Yeeth Security"
    },
    "veldekov.csv-pro-suite": {
        "campaign": "sleeper-73",
        "source": "Socket.dev"
    },
    "veltarik.duplicate-fast-helper": {
        "campaign": "sleeper-73",
        "source": "Socket.dev"
    },
    "vendrakos.rumdl-pro-kit": {
        "campaign": "sleeper-73",
        "source": "Socket.dev"
    },
    "victorbetweenhose.agent-auto-accept": {
        "campaign": "glassworm-v2",
        "source": "Socket.dev"
    },
    "vims-vsce.vscode-vim": {
        "campaign": "wave-3",
        "source": "Koi Security"
    },
    "vitalik.solidity": {
        "campaign": "wave-3",
        "source": "Koi Security"
    },
    "vornovin.ionic-easy-kit": {
        "campaign": "sleeper-73",
        "source": "Socket.dev"
    },
    "vs-publisher-988541.apexsql-power-tools": {
        "campaign": "evil-twin",
        "source": "Manifold Security"
    },
    "vsceue.volar-vscode": {
        "campaign": "wave-3",
        "source": "Koi Security"
    },
    "weldforick.brightscript-pro-kit": {
        "campaign": "sleeper-73",
        "source": "Socket.dev"
    },
    "wghats.vscode-nxunit-test-adapter": {
        "campaign": "evil-twin",
        "source": "Manifold Security"
    },
    "wildlightregain.oxc-lint-format": {
        "campaign": "sleeper-73",
        "source": "Socket.dev"
    },
    "winnerdomain17.version-lens-tool": {
        "campaign": "sleeper-73",
        "source": "Socket.dev"
    },
    "wordpresstools.wordpress": {
        "campaign": "evil-twin",
        "source": "Manifold Security"
    },
    "xnerd.ampscript-language": {
        "campaign": "evil-twin",
        "source": "Manifold Security"
    },
    "yamal-dext.wonder-workspace-icons": {
        "campaign": "wave-5",
        "source": "Socket.dev"
    },
    "yamaprolas.revature-labs-extension": {
        "campaign": "wave-5",
        "source": "Koi Security"
    },
    "yamlcode.yaml-vscode-extension": {
        "campaign": "wave-3",
        "source": "Koi Security"
    },
    "yardensachs.copy-python-path": {
        "campaign": "evil-twin",
        "source": "Manifold Security"
    },
    "yasuyuky.transient-emacs": {
        "campaign": "wave-2",
        "source": "Koi Security"
    },
    "ydaveluy.xsmp-modeler": {
        "campaign": "evil-twin",
        "source": "Manifold Security"
    },
    "ydaveluy.xsmp-tas-mdk": {
        "campaign": "evil-twin",
        "source": "Manifold Security"
    },
    "yelzunik.sqltools-smart-forge": {
        "campaign": "sleeper-73",
        "source": "Socket.dev"
    },
    "zgy.opencode-vscode-ui": {
        "campaign": "solana-may-2026",
        "source": "Yeeth Security"
    },
    "zoxon.monokai-deep": {
        "campaign": "evil-twin",
        "source": "Manifold Security"
    },
    "zubarets.latex-quick-suite": {
        "campaign": "sleeper-73",
        "source": "Socket.dev"
    }
};
exports.WAVE_MARKER = ['lzcd', 'rtfx', 'yqip', 'lpd'].join('');
exports.VS_RUN_MIN = 8;
exports.INVISIBLE_UNICODE_RUN_REGEX = /[\uFE00-\uFE0F\u{E0100}-\u{E01EF}]{8,}/u;
exports.INVISIBLE_UNICODE_BYTE_REGEX = /(?:\xEF\xB8[\x80-\x8F]|\xF3\xA0[\x84-\x87][\x80-\xBF]){8,}/;
exports.LEGIT_LIB_REGEX = /(^|[\/])(pdf\.js|pdfjs|pdf\.worker|fontkit|opentype|harfbuzz|icu4x|unicode|grapheme|emoji-regex|twemoji|guardian-virus-scan|auditData|scanner)/i;
exports.DECODER_PATTERN_REGEX = /(?:codePointAt\s*\([^)]*\)[\s\S]{0,500}(?:0xFE00|0xE0100|0xfe00|0xe0100)|(?:0xFE00|0xE0100|0xfe00|0xe0100)[\s\S]{0,500}codePointAt)/i;
