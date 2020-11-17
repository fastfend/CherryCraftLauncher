/**
 * AuthManager
 * 
 * This module aims to abstract login procedures. Results from Mojang's REST api
 * are retrieved through our Mojang module. These results are processed and stored,
 * if applicable, in the config using the ConfigManager. All login procedures should
 * be made through this module.
 * 
 * @module authmanager
 */
// Requirements
const ConfigManager = require('./configmanager')
const LoggerUtil    = require('./loggerutil')
const Mojang        = require('./mojang')
const logger        = LoggerUtil('%c[AuthManager]', 'color: #a02d2a; font-weight: bold')
const loggerSuccess = LoggerUtil('%c[AuthManager]', 'color: #209b07; font-weight: bold')
const crypto        = require('crypto');
// Functions

/**
 * Add an account. This will authenticate the given credentials with Mojang's
 * authserver. The resultant data will be stored as an auth account in the
 * configuration database.
 * 
 * @param {string} username The account username (email if migrated).
 * @param {string} password The account password.
 * @returns {Promise.<Object>} Promise which resolves the resolved authenticated account object.
 */
exports.addAccount = async function(username, password){
    try {
        const session = await Mojang.authenticate(username, password, ConfigManager.getClientToken())
        if(session.selectedProfile != null){
            const ret = ConfigManager.addAuthAccount(session.selectedProfile.id, session.accessToken, username, session.selectedProfile.name, false)
            if(ConfigManager.getClientToken() == null){
                ConfigManager.setClientToken(session.clientToken)
            }
            ConfigManager.save()
            return ret
        } else {
            throw new Error('NotPaidAccount')
        }
        
    } catch (err){
        return Promise.reject(err)
    }
}



function checkDec(n){return/^[0-9]{1,64}$/.test(n)}
function checkHex(n){return/^[0-9A-Fa-f]{1,64}$/.test(n)}
function Dec2Hex(n){if(!checkDec(n)||n<0)return 0;return n.toString(16)}
function Hex2Dec(n){if(!checkHex(n))return 0;return parseInt(n,16).toString(10)}

function generateUUID(username)
{
    var userid = "OfflinePlayer:" + username;
    var baseuuid = crypto.createHash('md5').update(userid).digest("hex");

    var mod_1 = Dec2Hex(Hex2Dec(baseuuid.substr(12,2)) & 15 | 48).toString()
    var mod_2 = Dec2Hex(Hex2Dec(baseuuid.substr(16,2)) & 63 | 128).toString()

    return baseuuid.substr(0,12) + mod_1 + baseuuid.substr(14,2) + mod_2 + baseuuid.substr(18,14);
}



/**
 * Add an nonpremium account.
 * 
 * @param {string} username The account username (email if migrated).
 * @returns {Promise.<Object>} Promise which resolves the resolved authenticated account object.
 */
exports.addNonpremiumAccount = async function(username){
    try {
        const uuid = generateUUID(username)
        const ret = ConfigManager.addAuthAccount(uuid, uuid, username, username, true)
        ConfigManager.save()
        return ret
        
    } catch (err){
        return Promise.reject(err)
    }
}


/**
 * Remove an account. This will invalidate the access token associated
 * with the account and then remove it from the database.
 * 
 * @param {string} uuid The UUID of the account to be removed.
 * @returns {Promise.<void>} Promise which resolves to void when the action is complete.
 */
exports.removeAccount = async function(uuid, offline){
    try {
        if(!offline)
        {
            const authAcc = ConfigManager.getAuthAccount(uuid)
            await Mojang.invalidate(authAcc.accessToken, ConfigManager.getClientToken())
        }
        ConfigManager.removeAuthAccount(uuid)
        ConfigManager.save()
        return Promise.resolve()
    } catch (err){
        return Promise.reject(err)
    }
}

/**
 * Validate the selected account with Mojang's authserver. If the account is not valid,
 * we will attempt to refresh the access token and update that value. If that fails, a
 * new login will be required.
 * 
 * **Function is WIP**
 * 
 * @returns {Promise.<boolean>} Promise which resolves to true if the access token is valid,
 * otherwise false.
 */
exports.validateSelected = async function(){
    const current = ConfigManager.getSelectedAccount()
    const isValid = await Mojang.validate(current.accessToken, ConfigManager.getClientToken())
    if(!isValid){
        try {
            const session = await Mojang.refresh(current.accessToken, ConfigManager.getClientToken())
            ConfigManager.updateAuthAccount(current.uuid, session.accessToken)
            ConfigManager.save()
        } catch(err) {
            logger.debug('Error while validating selected profile:', err)
            if(err && err.error === 'ForbiddenOperationException'){
                // What do we do?
            }
            logger.log('Account access token is invalid.')
            return false
        }
        loggerSuccess.log('Account access token validated.')
        return true
    } else {
        loggerSuccess.log('Account access token validated.')
        return true
    }
}