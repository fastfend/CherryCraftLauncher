/**
 * Script for landing.ejs
 */
// Requirements
const cp                      = require('child_process')
const sudo                    = require('sudo-prompt');
const crypto                  = require('crypto')
const {URL}                   = require('url')
const fs                      = require('fs')
const { spawnSync }           = require('child_process')
const http                    = require('http')
const progress                = require('request-progress')
// Internal Requirements
const DiscordWrapper          = require('./assets/js/discordwrapper')
const Mojang                  = require('./assets/js/mojang')
const ProcessBuilder          = require('./assets/js/processbuilder')
const ServerStatus            = require('./assets/js/serverstatus')
const request                 = require('request');
// Launch Elements
const launch_content          = document.getElementById('launch_content')
const launch_details          = document.getElementById('launch_details')
const launch_progress         = document.getElementById('launch_progress')
const launch_progress_label   = document.getElementById('launch_progress_label')
const launch_details_text     = document.getElementById('launch_details_text')
const server_selection_button = document.getElementById('server_selection_button')
const user_text               = document.getElementById('user_text')

const loggerLanding = LoggerUtil('%c[Landing]', 'color: #000668; font-weight: bold')

/* Launch Progress Wrapper Functions */

/**
 * Show/hide the loading area.
 * 
 * @param {boolean} loading True if the loading area should be shown, otherwise false.
 */
function toggleLaunchArea(loading){
    if(loading){
        launch_details.style.display = 'flex'
        launch_content.style.display = 'none'
    } else {
        launch_details.style.display = 'none'
        launch_content.style.display = 'inline-flex'
    }
}

/**
 * Set the details text of the loading area.
 * 
 * @param {string} details The new text for the loading details.
 */
function setLaunchDetails(details){
    launch_details_text.innerHTML = details
}

/**
 * Set the value of the loading progress bar and display that value.
 * 
 * @param {number} value The progress value.
 * @param {number} max The total size.
 * @param {number|string} percent Optional. The percentage to display on the progress label.
 */
function setLaunchPercentage(value, max, percent = ((value/max)*100)){
    launch_progress.setAttribute('max', max)
    launch_progress.setAttribute('value', value)
    launch_progress_label.innerHTML = percent + '%'
}

/**
 * Set the value of the OS progress bar and display that on the UI.
 * 
 * @param {number} value The progress value.
 * @param {number} max The total download size.
 * @param {number|string} percent Optional. The percentage to display on the progress label.
 */
function setDownloadPercentage(value, max, percent = ((value/max)*100)){
    remote.getCurrentWindow().setProgressBar(value/max)
    setLaunchPercentage(value, max, percent)
}

/**
 * Enable or disable the launch button.
 * 
 * @param {boolean} val True to enable, false to disable.
 */
function setLaunchEnabled(val){
    document.getElementById('launch_button').disabled = !val
}




function checkOpenAL()
{
    var letter = showLetter();
    const path = letter + '\\System32\\OpenAL32.dll'

    try {
      if (fs.existsSync(path)) {
        return true;
      }
    } catch(err) {
      console.error(err)
    }
    return false;
}

function showLetter()
{
    var data = null;
    try
    {
        const child = spawnSync('cmd.exe', ['/c', 'echo', '%WINDIR%']);
        data = child.stdout.toString();
        data = data.replace(/(?:\\[rn]|[\r\n]+)+/g, "");
    }
    catch (e)
    {
        return null;
    }
    return data;
}

function installOpenAL()
{
    setOverlayContent(
        'Nie wykryto odpowiedniej<br>instalacji OpenAL',
        'Launcher zainstaluje OpenAL za Ciebie, pamiętaj by zgodzić się na instalację OpenAL!',
        'OK',
    )
    setOverlayHandler(() => {
        setLaunchDetails('Pobieranie OpenAL...')
        toggleOverlay(false)
        toggleLaunchArea(true)
        setLaunchPercentage(0, 100)

        var path = ConfigManager.getDataDirectory() + "\\openal.exe";
        loggerLanding.log('Downloading into: ' + path)
        const file = fs.createWriteStream(path);
        const sendReq = request.get("https://updates.hqcraft.pl/mcdata/libs/openal.exe");

        sendReq.on('response', (response) => {
            if (response.statusCode !== 200) {
                loggerLanding.log('error' + response,toString())
                showLaunchFailure("Błąd podczas pobierania OpenAL", "Nie udało się pobrać OpenAL. Spróbuj ponownie jeszcze raz lub zainstaluj <a href=\"https://updates.hqcraft.pl/mcdata/libs/openal.exe\">ręcznie</a>")
            }
            else
            {
                sendReq.pipe(file);
            }

        });
    
        file.on('finish', () => 
        {
            setLaunchPercentage(100, 100)
            setLaunchDetails('Instalacja OpenAL...')

            
            var options = {
              name: 'HQCraft Launcher'
            };
            sudo.exec(path + " /SILENT", options,
              function(error, stdout, stderr) {
                if(checkOpenAL())
                {
                    const mcVersion = DistroManager.getDistribution().getServer(ConfigManager.getSelectedServer()).getMinecraftVersion()
                    const jExe = ConfigManager.getJavaExecutable()
                    if(jExe == null){
                        asyncSystemScan(mcVersion)
                    } else {
                
                        setLaunchDetails(Lang.queryJS('landing.launch.pleaseWait'))
                        toggleLaunchArea(true)
                        setLaunchPercentage(0, 100)
                
                        const jg = new JavaGuard(mcVersion)
                        jg._validateJavaBinary(jExe).then((v) => {
                            loggerLanding.log('Java version meta', v)
                            if(v.valid){
                                dlAsync()
                            } else {
                                asyncSystemScan(mcVersion)
                            }
                        })
                    }
                }
                else
                {
                    showLaunchFailure("Błąd podczas instalacji OpenAL", "Nie udało się zainstlować OpenAL. Spróbuj ponownie jeszcze raz lub zainstaluj <a href=\"https://updates.hqcraft.pl/mcdata/libs/openal.exe\">ręcznie</a>")
                    if (error)
                    {
                        loggerLanding.log(error.toString())
                    }
                    else
                    {
                        loggerLanding.log('????')        
                    }
                }
              }
            );
        });
    
        // check for request errors
        sendReq.on('error', (err) => {
            fs.unlink(dest);
            //wywal
            loggerLanding.log('error' + err.toString())
            showLaunchFailure("Błąd podczas pobierania OpenAL", "Nie udało się pobrać OpenAL. Spróbuj ponownie jeszcze raz lub zainstaluj <a href=\"https://updates.hqcraft.pl/mcdata/libs/openal.exe\">ręcznie</a>")
        });
    
        file.on('error', (err) => { // Handle errors
            fs.unlink(dest); // Delete the file async. (But we don't check the result)
            //wywal
            loggerLanding.log('error' + err.toString())
            showLaunchFailure("Błąd podczas pobierania OpenAL", "Nie udało się pobrać OpenAL. Spróbuj ponownie jeszcze raz lub zainstaluj <a href=\"https://updates.hqcraft.pl/mcdata/libs/openal.exe\">ręcznie</a>")
        });
    })
    toggleOverlay(true)
}

// Bind launch button
document.getElementById('launch_button').addEventListener('click', function(e){
    loggerLanding.log('Launching game..')
    loggerLanding.log('Checking for OpenAL..')

    if(!checkOpenAL())
    {
        installOpenAL()
    }
    else
    {
        const mcVersion = DistroManager.getDistribution().getServer(ConfigManager.getSelectedServer()).getMinecraftVersion()
        const jExe = ConfigManager.getJavaExecutable()
        if(jExe == null){
            asyncSystemScan(mcVersion)
        } else {
    
            setLaunchDetails(Lang.queryJS('landing.launch.pleaseWait'))
            toggleLaunchArea(true)
            setLaunchPercentage(0, 100)
    
            const jg = new JavaGuard(mcVersion)
            jg._validateJavaBinary(jExe).then((v) => {
                loggerLanding.log('Java version meta', v)
                if(v.valid){
                    dlAsync()
                } else {
                    asyncSystemScan(mcVersion)
                }
            })
        }
    }
    //download https://updates.hqcraft.pl/mcdata/libs/openal.exe


})

// Bind settings button
document.getElementById('settingsMediaButton').onclick = (e) => {
    prepareSettings()
    switchView(getCurrentView(), VIEWS.settings)
}

// Bind selected account
function updateSelectedAccount(authUser){
    let username = 'No Account Selected'
    if(authUser != null){
        if(authUser.displayName != null){
            username = authUser.displayName
        }
        if(authUser.uuid != null){
            document.getElementById('avatarContainer').style.backgroundImage = `url('https://crafatar.com/avatars/${authUser.uuid}')`
        }
    }
    user_text.innerHTML = username
}
updateSelectedAccount(ConfigManager.getSelectedAccount())

// Bind selected server
function updateSelectedServer(serv){
    if(getCurrentView() === VIEWS.settings){
        saveAllModConfigurations()
    }
    ConfigManager.setSelectedServer(serv != null ? serv.getID() : null)
    ConfigManager.save()
    server_selection_button.innerHTML = '\u2022 ' + (serv != null ? serv.getName() : 'Brak wybranej wersji')
    if(getCurrentView() === VIEWS.settings){
        animateModsTabRefresh()
    }
    setLaunchEnabled(serv != null)
}
// Real text is set in uibinder.js on distributionIndexDone.
server_selection_button.innerHTML = '\u2022 Ładowanie..'
server_selection_button.onclick = (e) => {
    e.target.blur()
    toggleServerSelection(true)
}

const refreshServerStatus = async function(fade = false){
    loggerLanding.log('Refreshing Server Status')
    const serv = DistroManager.getDistribution().getServer(ConfigManager.getSelectedServer())

    let pLabel = 'SERWER'
    let pVal = 'OFFLINE'
    const serverURL = new URL('my://' + serv.getAddress())
    let options = {json: true};

    request("https://api.mcsrvstat.us/2/" + serverURL.hostname, options, (error, res, body) => {
        if (error) {
            loggerLanding.warn('Unable to refresh server status, assuming offline.')
            loggerLanding.log(err)
        }
    
        if (!error && res.statusCode == 200) {
            loggerLanding.log(body)
            if(body.online)
            {
                pLabel = 'GRACZY'
                pVal = body.players.online.toString() + '/' + body.players.max.toString()
                loggerLanding.log(pLabel)
                loggerLanding.log(pVal)
            }
        }

        if(fade){
            $('#server_status_wrapper').fadeOut(250, () => {
                document.getElementById('landingPlayerLabel').innerHTML = pLabel
                document.getElementById('player_count').innerHTML = pVal
                $('#server_status_wrapper').fadeIn(500)
            })
        } else {
            document.getElementById('landingPlayerLabel').innerHTML = pLabel
            document.getElementById('player_count').innerHTML = pVal
        }
    });
}
// Server Status is refreshed in uibinder.js on distributionIndexDone.

// Set refresh rate to once every 2 minutes.
let serverStatusListener = setInterval(() => refreshServerStatus(true), 120000)

/**
 * Shows an error overlay, toggles off the launch area.
 * 
 * @param {string} title The overlay title.
 * @param {string} desc The overlay description.
 */
function showLaunchFailure(title, desc){
    setOverlayContent(
        title,
        desc,
        'OK'
    )
    setOverlayHandler(null)
    toggleOverlay(true)
    toggleLaunchArea(false)
}

/* System (Java) Scan */

var sysAEx
let scanAt

let extractListener

/**
 * Asynchronously scan the system for valid Java installations.
 * 
 * @param {string} mcVersion The Minecraft version we are scanning for.
 * @param {boolean} launchAfter Whether we should begin to launch after scanning. 
 */
function asyncSystemScan(mcVersion, launchAfter = true){

    setLaunchDetails('Proszę czekać...')
    toggleLaunchArea(true)
    setLaunchPercentage(0, 100)

    const loggerSysAEx = LoggerUtil('%c[SysAEx]', 'color: #353232; font-weight: bold')

    const forkEnv = JSON.parse(JSON.stringify(process.env))
    forkEnv.CONFIG_DIRECT_PATH = ConfigManager.getLauncherDirectory()

    // Fork a process to run validations.
    sysAEx = cp.fork(path.join(__dirname, 'assets', 'js', 'assetexec.js'), [
        'JavaGuard',
        mcVersion
    ], {
        env: forkEnv,
        stdio: 'pipe'
    })
    // Stdout
    sysAEx.stdio[1].setEncoding('utf8')
    sysAEx.stdio[1].on('data', (data) => {
        loggerSysAEx.log(data)
    })
    // Stderr
    sysAEx.stdio[2].setEncoding('utf8')
    sysAEx.stdio[2].on('data', (data) => {
        loggerSysAEx.log(data)
    })
    
    sysAEx.on('message', (m) => {

        if(m.context === 'validateJava'){
            if(m.result == null){
                // If the result is null, no valid Java installation was found.
                // Show this information to the user.
                setOverlayContent(
                    'Nie wykryto odpowiedniej<br>instalacji Javy',
                    'Aby móc grać w HQ Craft, potrzebujesz Java 8 w wersji 64 bit. Czy zainstalować Javę za Ciebie? Instalując akceptujesz <a href="http://www.oracle.com/technetwork/java/javase/terms/license/index.html">licencję Oracle</a>.',
                    'Zainstaluj za mnie',
                    'Zainstaluję ręczne'
                )
                setOverlayHandler(() => {
                    setLaunchDetails('Przygotowanie do pobrania Javy..')
                    sysAEx.send({task: 'changeContext', class: 'AssetGuard', args: [ConfigManager.getCommonDirectory(),ConfigManager.getJavaExecutable()]})
                    sysAEx.send({task: 'execute', function: '_enqueueOpenJDK', argsArr: [ConfigManager.getDataDirectory()]})
                    toggleOverlay(false)
                })
                setDismissHandler(() => {
                    $('#overlayContent').fadeOut(250, () => {
                        //$('#overlayDismiss').toggle(false)
                        setOverlayContent(
                            'Java jest wymagana<br>do uruchomienia',
                            'Prawidłowa instalcja Java 8 w wersji 64 bit jest wymagana do uruchomienia HQCraft.',
                            'OK',
                            'Powrót'
                        )
                        setOverlayHandler(() => {
                            toggleLaunchArea(false)
                            toggleOverlay(false)
                        })
                        setDismissHandler(() => {
                            toggleOverlay(false, true)
                            asyncSystemScan()
                        })
                        $('#overlayContent').fadeIn(250)
                    })
                })
                toggleOverlay(true, true)

            } else {
                // Java installation found, use this to launch the game.
                ConfigManager.setJavaExecutable(m.result)
                ConfigManager.save()

                // We need to make sure that the updated value is on the settings UI.
                // Just incase the settings UI is already open.
                settingsJavaExecVal.value = m.result
                populateJavaExecDetails(settingsJavaExecVal.value)

                if(launchAfter){
                    dlAsync()
                }
                sysAEx.disconnect()
            }
        } else if(m.context === '_enqueueOpenJDK'){

            if(m.result === true){

                // Oracle JRE enqueued successfully, begin download.
                setLaunchDetails('Pobieranie Javy..')
                sysAEx.send({task: 'execute', function: 'processDlQueues', argsArr: [[{id:'java', limit:1}]]})

            } else {

                // Oracle JRE enqueue failed. Probably due to a change in their website format.
                // User will have to follow the guide to install Java.
                setOverlayContent(
                    'Nieoczekiwany błąd:<br>Błąd pobierania Javy',
                    'Nie udało się pobrać Javy, spróbuj ponownie lub zainstaluj Javę ręcznie',
                    'OK'
                )
                setOverlayHandler(() => {
                    toggleOverlay(false)
                    toggleLaunchArea(false)
                })
                toggleOverlay(true)
                sysAEx.disconnect()

            }

        } else if(m.context === 'progress'){

            switch(m.data){
                case 'download':
                    // Downloading..
                    setDownloadPercentage(m.value, m.total, m.percent)
                    break
            }

        } else if(m.context === 'complete'){

            switch(m.data){
                case 'download': {
                    // Show installing progress bar.
                    remote.getCurrentWindow().setProgressBar(2)

                    // Wait for extration to complete.
                    const eLStr = 'Wypakowywanie'
                    let dotStr = ''
                    setLaunchDetails(eLStr)
                    extractListener = setInterval(() => {
                        if(dotStr.length >= 3){
                            dotStr = ''
                        } else {
                            dotStr += '.'
                        }
                        setLaunchDetails(eLStr + dotStr)
                    }, 750)
                    break
                }
                case 'java':
                // Download & extraction complete, remove the loading from the OS progress bar.
                    remote.getCurrentWindow().setProgressBar(-1)

                    // Extraction completed successfully.
                    ConfigManager.setJavaExecutable(m.args[0])
                    ConfigManager.save()

                    if(extractListener != null){
                        clearInterval(extractListener)
                        extractListener = null
                    }

                    setLaunchDetails('Pomyślnie zainstalowano Javę!')

                    if(launchAfter){
                        dlAsync()
                    }

                    sysAEx.disconnect()
                    break
            }

        } else if(m.context === 'error'){
            console.log(m.error)
        }
    })

    // Begin system Java scan.
    setLaunchDetails('Sprawdzam informacje o systemie..')
    sysAEx.send({task: 'execute', function: 'validateJava', argsArr: [ConfigManager.getDataDirectory()]})

}

// Keep reference to Minecraft Process
let proc
// Is DiscordRPC enabled
let hasRPC = false
// Joined server regex
const SERVER_JOINED_REGEX = /\[.+\]: \[CHAT\] [a-zA-Z0-9_]{1,16} joined the game/
const GAME_JOINED_REGEX = /\[.+\]: Skipping bad option: lastServer:/
const GAME_LAUNCH_REGEX = /^\[.+\]: MinecraftForge .+ Initialized$/

let aEx
let serv
let versionData
let forgeData

let progressListener

function dlAsync(login = true){

    // Login parameter is temporary for debug purposes. Allows testing the validation/downloads without
    // launching the game.

    if(login) {
        if(ConfigManager.getSelectedAccount() == null){
            loggerLanding.error('You must be logged into an account.')
            return
        }
    }

    setLaunchDetails('Proszę czekać..')
    toggleLaunchArea(true)
    setLaunchPercentage(0, 100)

    const loggerAEx = LoggerUtil('%c[AEx]', 'color: #353232; font-weight: bold')
    const loggerLaunchSuite = LoggerUtil('%c[LaunchSuite]', 'color: #000668; font-weight: bold')

    const forkEnv = JSON.parse(JSON.stringify(process.env))
    forkEnv.CONFIG_DIRECT_PATH = ConfigManager.getLauncherDirectory()

    // Start AssetExec to run validations and downloads in a forked process.
    aEx = cp.fork(path.join(__dirname, 'assets', 'js', 'assetexec.js'), [
        'AssetGuard',
        ConfigManager.getCommonDirectory(),
        ConfigManager.getJavaExecutable()
    ], {
        env: forkEnv,
        stdio: 'pipe'
    })
    // Stdout
    aEx.stdio[1].setEncoding('utf8')
    aEx.stdio[1].on('data', (data) => {
        loggerAEx.log(data)
    })
    // Stderr
    aEx.stdio[2].setEncoding('utf8')
    aEx.stdio[2].on('data', (data) => {
        loggerAEx.log(data)
    })
    aEx.on('error', (err) => {
        loggerLaunchSuite.error('Error during launch', err)
        showLaunchFailure('Wystąpił błąd podczas uruchamiania gry', err.message || 'Zobacz konsolę (CTRL + Shift + i) by dowiedzieć się wiecej.')
    })
    aEx.on('close', (code, signal) => {
        if(code !== 0){
            loggerLaunchSuite.error(`AssetExec exited with code ${code}, assuming error.`)
            showLaunchFailure('Wystąpił błąd podczas uruchamiania gry', 'Zobacz konsolę (CTRL + Shift + i) by dowiedzieć się wiecej.')
        }
    })

    // Establish communications between the AssetExec and current process.
    aEx.on('message', (m) => {

        if(m.context === 'validate'){
            switch(m.data){
                case 'distribution':
                    setLaunchPercentage(20, 100)
                    loggerLaunchSuite.log('Validated distibution index.')
                    setLaunchDetails('Pobieram informacje o wersji..')
                    break
                case 'version':
                    setLaunchPercentage(40, 100)
                    loggerLaunchSuite.log('Version data loaded.')
                    setLaunchDetails('Sprawdzam zgodność assetów..')
                    break
                case 'assets':
                    setLaunchPercentage(60, 100)
                    loggerLaunchSuite.log('Asset Validation Complete')
                    setLaunchDetails('Sprawdzam zgodność bibliotek..')
                    break
                case 'libraries':
                    setLaunchPercentage(80, 100)
                    loggerLaunchSuite.log('Library validation complete.')
                    setLaunchDetails('Sprawdzam zgodność plików dodatkowych..')
                    break
                case 'files':
                    setLaunchPercentage(100, 100)
                    loggerLaunchSuite.log('File validation complete.')
                    setLaunchDetails('Pobieranie plików..')
                    break
            }
        } else if(m.context === 'progress'){
            switch(m.data){
                case 'assets': {
                    const perc = (m.value/m.total)*20
                    setLaunchPercentage(40+perc, 100, parseInt(40+perc))
                    break
                }
                case 'download':
                    setDownloadPercentage(m.value, m.total, m.percent)
                    break
                case 'extract': {
                    // Show installing progress bar.
                    remote.getCurrentWindow().setProgressBar(2)

                    // Download done, extracting.
                    const eLStr = 'Wypakowywanie bibliotek'
                    let dotStr = ''
                    setLaunchDetails(eLStr)
                    progressListener = setInterval(() => {
                        if(dotStr.length >= 3){
                            dotStr = ''
                        } else {
                            dotStr += '.'
                        }
                        setLaunchDetails(eLStr + dotStr)
                    }, 750)
                    break
                }
            }
        } else if(m.context === 'complete'){
            switch(m.data){
                case 'download':
                    // Download and extraction complete, remove the loading from the OS progress bar.
                    remote.getCurrentWindow().setProgressBar(-1)
                    if(progressListener != null){
                        clearInterval(progressListener)
                        progressListener = null
                    }

                    setLaunchDetails('Przygotowywanie do uruchomienia..')
                    break
            }
        } else if(m.context === 'error'){
            switch(m.data){
                case 'download':
                    loggerLaunchSuite.error('Error while downloading:', m.error)
                    
                    if(m.error.code === 'ENOENT'){
                        showLaunchFailure(
                            'Błąd pobierania',
                            'Nie udało się podłączyć do serwera danych HQ. Sprawdź stan swojego połączenia internetowego.'
                        )
                    } else {
                        showLaunchFailure(
                            'Błąd pobierania',
                            'Zobacz konsolę (CTRL + Shift + i) by dowiedzieć się wiecej.'
                        )
                    }

                    remote.getCurrentWindow().setProgressBar(-1)

                    // Disconnect from AssetExec
                    aEx.disconnect()
                    break
            }
        } else if(m.context === 'validateEverything'){

            let allGood = true

            // If these properties are not defined it's likely an error.
            if(m.result.forgeData == null || m.result.versionData == null){
                loggerLaunchSuite.error('Error during validation:', m.result)

                loggerLaunchSuite.error('Error during launch', m.result.error)
                showLaunchFailure('Błąd weryfikacji plików', 'Zobacz konsolę (CTRL + Shift + i) by dowiedzieć się wiecej.')

                allGood = false
            }

            forgeData = m.result.forgeData
            versionData = m.result.versionData

            if(login && allGood) {
                const authUser = ConfigManager.getSelectedAccount()
                loggerLaunchSuite.log(`Sending selected account (${authUser.displayName}) to ProcessBuilder.`)
                let pb = new ProcessBuilder(serv, versionData, forgeData, authUser, remote.app.getVersion())
                setLaunchDetails('Uruchamianie..')

                // Attach a temporary listener to the client output.
                // Will wait for a certain bit of text meaning that
                // the client application has started, and we can hide
                // the progress bar stuff.
                const tempListener = function(data){
                    if(GAME_LAUNCH_REGEX.test(data.trim())){
                        toggleLaunchArea(false)
                        if(hasRPC){
                            DiscordWrapper.updateDetails('Ładowanie gry..')
                        }
                        proc.stdout.on('data', gameStateChange)
                        proc.stdout.removeListener('data', tempListener)
                        proc.stderr.removeListener('data', gameErrorListener)
                    }
                }

                // Listener for Discord RPC.
                const gameStateChange = function(data){
                    data = data.trim()
                    if(SERVER_JOINED_REGEX.test(data)){
                        DiscordWrapper.updateDetails('Na serwerze!')
                    } else if(GAME_JOINED_REGEX.test(data)){
                        DiscordWrapper.updateDetails('W menu!')
                    }
                }

                const gameErrorListener = function(data){
                    data = data.trim()
                    if(data.indexOf('Could not find or load main class net.minecraft.launchwrapper.Launch') > -1){
                        loggerLaunchSuite.error('Game launch failed, LaunchWrapper was not downloaded properly.')
                        showLaunchFailure('Błąd podczas uruchamiania', 'Główny plik, LaunchWrapper, nie został pobrany. Z tego powodu gra nie może się uruchomić.<br><br>Aby naprawić ten błąd, tymczasowo wyłącz antywirusa i spróbuj ponownie.')
                    }
                }

                try {
                    // Build Minecraft process.
                    proc = pb.build()

                    // Bind listeners to stdout.
                    proc.stdout.on('data', tempListener)
                    proc.stderr.on('data', gameErrorListener)

                    setLaunchDetails('Powodzenie. Miłej gry!')

                    // Init Discord Hook
                    const distro = DistroManager.getDistribution()
                    if(distro.discord != null && serv.discord != null){
                        DiscordWrapper.initRPC(distro.discord, serv.discord)
                        hasRPC = true
                        proc.on('close', (code, signal) => {
                            loggerLaunchSuite.log('Shutting down Discord Rich Presence..')
                            DiscordWrapper.shutdownRPC()
                            hasRPC = false
                            proc = null
                        })
                    }

                } catch(err) {

                    loggerLaunchSuite.error('Error during launch', err)
                    showLaunchFailure('Błąd podczas uruchamiania', 'Zobacz konsolę (CTRL + Shift + i) by dowiedzieć się wiecej.')

                }
            }

            // Disconnect from AssetExec
            aEx.disconnect()

        }
    })

    // Begin Validations

    // Validate Forge files.
    setLaunchDetails('Pobieranie informacji o wersji..')

    refreshDistributionIndex(true, (data) => {
        onDistroRefresh(data)
        serv = data.getServer(ConfigManager.getSelectedServer())
        aEx.send({task: 'execute', function: 'validateEverything', argsArr: [ConfigManager.getSelectedServer(), DistroManager.isDevMode()]})
    }, (err) => {
        loggerLaunchSuite.log('Error while fetching a fresh copy of the distribution index.', err)
        refreshDistributionIndex(false, (data) => {
            onDistroRefresh(data)
            serv = data.getServer(ConfigManager.getSelectedServer())
            aEx.send({task: 'execute', function: 'validateEverything', argsArr: [ConfigManager.getSelectedServer(), DistroManager.isDevMode()]})
        }, (err) => {
            loggerLaunchSuite.error('Unable to refresh distribution index.', err)
            if(DistroManager.getDistribution() == null){
                showLaunchFailure('Błąd krytyczny', 'Nie udało się pobrać pliku dystrybucji. Zobacz konsolę (CTRL + Shift + i) by dowiedzieć się wiecej.')

                // Disconnect from AssetExec
                aEx.disconnect()
            } else {
                serv = data.getServer(ConfigManager.getSelectedServer())
                aEx.send({task: 'execute', function: 'validateEverything', argsArr: [ConfigManager.getSelectedServer(), DistroManager.isDevMode()]})
            }
        })
    })
}

/**
 * News Loading Functions
 */

// DOM Cache
const newsContent                   = document.getElementById('newsContent')
const newsArticleTitle              = document.getElementById('newsArticleTitle')
const newsArticleDate               = document.getElementById('newsArticleDate')
const newsArticleAuthor             = document.getElementById('newsArticleAuthor')
const newsArticleComments           = document.getElementById('newsArticleComments')
const newsNavigationStatus          = document.getElementById('newsNavigationStatus')
const newsArticleContentScrollable  = document.getElementById('newsArticleContentScrollable')
const nELoadSpan                    = document.getElementById('nELoadSpan')

// News slide caches.
let newsActive = false
let newsGlideCount = 0

/**
 * Show the news UI via a slide animation.
 * 
 * @param {boolean} up True to slide up, otherwise false. 
 */
function slide_(up){
    const lCUpper = document.querySelector('#landingContainer > #upper')
    const lCLLeft = document.querySelector('#landingContainer > #lower > #left')
    const lCLCenter = document.querySelector('#landingContainer > #lower > #center')
    const lCLRight = document.querySelector('#landingContainer > #lower > #right')
    const newsBtn = document.querySelector('#landingContainer > #lower > #center #content')
    const landingContainer = document.getElementById('landingContainer')
    const newsContainer = document.querySelector('#landingContainer > #newsContainer')

    newsGlideCount++

    if(up){
        lCUpper.style.top = '-200vh'
        lCLLeft.style.top = '-200vh'
        lCLCenter.style.top = '-200vh'
        lCLRight.style.top = '-200vh'
        newsBtn.style.top = '130vh'
        newsContainer.style.top = '0px'
        //date.toLocaleDateString('en-US', {month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: 'numeric'})
        //landingContainer.style.background = 'rgba(29, 29, 29, 0.55)'
        landingContainer.style.background = 'rgba(0, 0, 0, 0.50)'
        setTimeout(() => {
            if(newsGlideCount === 1){
                lCLCenter.style.transition = 'none'
                newsBtn.style.transition = 'none'
            }
            newsGlideCount--
        }, 2000)
    } else {
        setTimeout(() => {
            newsGlideCount--
        }, 2000)
        landingContainer.style.background = null
        lCLCenter.style.transition = null
        newsBtn.style.transition = null
        newsContainer.style.top = '100%'
        lCUpper.style.top = '0px'
        lCLLeft.style.top = '0px'
        lCLCenter.style.top = '0px'
        lCLRight.style.top = '0px'
        newsBtn.style.top = '10px'
    }
}

// Bind news button.
document.getElementById('newsButton').onclick = () => {
    // Toggle tabbing.
    if(newsActive){
        $('#landingContainer *').removeAttr('tabindex')
        $('#newsContainer *').attr('tabindex', '-1')
    } else {
        $('#landingContainer *').attr('tabindex', '-1')
        $('#newsContainer, #newsContainer *, #lower, #lower #center *').removeAttr('tabindex')
        if(newsAlertShown){
            $('#newsButtonAlert').fadeOut(2000)
            newsAlertShown = false
            ConfigManager.setNewsCacheDismissed(true)
            ConfigManager.save()
        }
    }
    slide_(!newsActive)
    newsActive = !newsActive
}

// Array to store article meta.
let newsArr = null

// News load animation listener.
let newsLoadingListener = null

/**
 * Set the news loading animation.
 * 
 * @param {boolean} val True to set loading animation, otherwise false.
 */
function setNewsLoading(val){
    if(val){
        const nLStr = 'Sprawdzam wiadomości'
        let dotStr = '..'
        nELoadSpan.innerHTML = nLStr + dotStr
        newsLoadingListener = setInterval(() => {
            if(dotStr.length >= 3){
                dotStr = ''
            } else {
                dotStr += '.'
            }
            nELoadSpan.innerHTML = nLStr + dotStr
        }, 750)
    } else {
        if(newsLoadingListener != null){
            clearInterval(newsLoadingListener)
            newsLoadingListener = null
        }
    }
}

// Bind retry button.
newsErrorRetry.onclick = () => {
    $('#newsErrorFailed').fadeOut(250, () => {
        initNews()
        $('#newsErrorLoading').fadeIn(250)
    })
}

newsArticleContentScrollable.onscroll = (e) => {
    if(e.target.scrollTop > Number.parseFloat($('.newsArticleSpacerTop').css('height'))){
        newsContent.setAttribute('scrolled', '')
    } else {
        newsContent.removeAttribute('scrolled')
    }
}

/**
 * Reload the news without restarting.
 * 
 * @returns {Promise.<void>} A promise which resolves when the news
 * content has finished loading and transitioning.
 */
function reloadNews(){
    return new Promise((resolve, reject) => {
        $('#newsContent').fadeOut(250, () => {
            $('#newsErrorLoading').fadeIn(250)
            initNews().then(() => {
                resolve()
            })
        })
    })
}

let newsAlertShown = false

/**
 * Show the news alert indicating there is new news.
 */
function showNewsAlert(){
    newsAlertShown = true
    $(newsButtonAlert).fadeIn(250)
}

/**
 * Initialize News UI. This will load the news and prepare
 * the UI accordingly.
 * 
 * @returns {Promise.<void>} A promise which resolves when the news
 * content has finished loading and transitioning.
 */
function initNews(){

    return new Promise((resolve, reject) => {
        setNewsLoading(true)

        let news = {}
        loadNews().then(news => {

            newsArr = news.articles || null

            if(newsArr == null){
                // News Loading Failed
                setNewsLoading(false)

                $('#newsErrorLoading').fadeOut(250, () => {
                    $('#newsErrorFailed').fadeIn(250, () => {
                        resolve()
                    })
                })
            } else if(newsArr.length === 0) {
                // No News Articles
                setNewsLoading(false)

                ConfigManager.setNewsCache({
                    date: null,
                    content: null,
                    dismissed: false
                })
                ConfigManager.save()

                $('#newsErrorLoading').fadeOut(250, () => {
                    $('#newsErrorNone').fadeIn(250, () => {
                        resolve()
                    })
                })
            } else {
                // Success
                setNewsLoading(false)

                const lN = newsArr[0]
                const cached = ConfigManager.getNewsCache()
                let newHash = crypto.createHash('sha1').update(lN.content).digest('hex')
                let newDate = new Date(lN.date)
                let isNew = false

                if(cached.date != null && cached.content != null){

                    if(new Date(cached.date) >= newDate){

                        // Compare Content
                        if(cached.content !== newHash){
                            isNew = true
                            showNewsAlert()
                        } else {
                            if(!cached.dismissed){
                                isNew = true
                                showNewsAlert()
                            }
                        }

                    } else {
                        isNew = true
                        showNewsAlert()
                    }

                } else {
                    isNew = true
                    showNewsAlert()
                }

                if(isNew){
                    ConfigManager.setNewsCache({
                        date: newDate.getTime(),
                        content: newHash,
                        dismissed: false
                    })
                    ConfigManager.save()
                }

                const switchHandler = (forward) => {
                    let cArt = parseInt(newsContent.getAttribute('article'))
                    let nxtArt = forward ? (cArt >= newsArr.length-1 ? 0 : cArt + 1) : (cArt <= 0 ? newsArr.length-1 : cArt - 1)
            
                    displayArticle(newsArr[nxtArt], nxtArt+1)
                }

                document.getElementById('newsNavigateRight').onclick = () => { switchHandler(true) }
                document.getElementById('newsNavigateLeft').onclick = () => { switchHandler(false) }

                $('#newsErrorContainer').fadeOut(250, () => {
                    displayArticle(newsArr[0], 1)
                    $('#newsContent').fadeIn(250, () => {
                        resolve()
                    })
                })
            }

        })
        
    })
}

/**
 * Add keyboard controls to the news UI. Left and right arrows toggle
 * between articles. If you are on the landing page, the up arrow will
 * open the news UI.
 */
document.addEventListener('keydown', (e) => {
    if(newsActive){
        if(e.key === 'ArrowRight' || e.key === 'ArrowLeft'){
            document.getElementById(e.key === 'ArrowRight' ? 'newsNavigateRight' : 'newsNavigateLeft').click()
        }
        // Interferes with scrolling an article using the down arrow.
        // Not sure of a straight forward solution at this point.
        // if(e.key === 'ArrowDown'){
        //     document.getElementById('newsButton').click()
        // }
    } else {
        if(getCurrentView() === VIEWS.landing){
            if(e.key === 'ArrowUp'){
                document.getElementById('newsButton').click()
            }
        }
    }
})

/**
 * Display a news article on the UI.
 * 
 * @param {Object} articleObject The article meta object.
 * @param {number} index The article index.
 */
function displayArticle(articleObject, index){
    newsArticleTitle.innerHTML = articleObject.title
    newsArticleTitle.href = articleObject.link
    newsArticleDate.innerHTML = articleObject.date
    newsArticleContentScrollable.innerHTML = '<div id="newsArticleContentWrapper"><div class="newsArticleSpacerTop"></div>' + articleObject.content + '<div class="newsArticleSpacerBot"></div></div>'
    Array.from(newsArticleContentScrollable.getElementsByClassName('bbCodeSpoilerButton')).forEach(v => {
        v.onclick = () => {
            const text = v.parentElement.getElementsByClassName('bbCodeSpoilerText')[0]
            text.style.display = text.style.display === 'block' ? 'none' : 'block'
        }
    })
    newsNavigationStatus.innerHTML = index + ' z ' + newsArr.length
    newsContent.setAttribute('article', index-1)
}

/**
 * Load news information from the RSS feed specified in the
 * distribution index.
 */
function loadNews(){
    return new Promise((resolve, reject) => {
        const distroData = DistroManager.getDistribution()
        const newsFeed = distroData.getRSS()
        const newsHost = new URL(newsFeed).origin + '/'
        $.ajax(
            {
                url: newsFeed,
                success: (data) => {
                    const items = $(data).find('item')
                    const articles = []

                    for(let i=0; i<items.length; i++){
                    // JQuery Element
                        const el = $(items[i])

                        // Resolve date.
                        const date = new Date(el.find('pubDate').text()).toLocaleDateString('pl-PL', {day: 'numeric', month: 'short',  year: 'numeric'})

                        // Fix relative links in content.
                        let content = el.find('description').text()
                        let regex = /src="(?!http:\/\/|https:\/\/)(.+?)"/g
                        //let matches
                        //while((matches = regex.exec(content))){
                        //    content = content.replace(`"${matches[1]}"`, `"${newsHost + matches[1]}"`)
                        //}

                        let link   = el.find('link').text()
                        let title  = el.find('title').text()
                        let author = el.find('dc\\:creator').text()

                        // Generate article.
                        articles.push(
                            {
                                link,
                                title,
                                date,
                                author,
                                content
                            }
                        )
                    }
                    resolve({
                        articles
                    })
                },
                timeout: 2500
            }
        ).catch(err => {
            resolve({
                articles: null
            })
        })
    })
}