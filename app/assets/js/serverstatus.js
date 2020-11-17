const net = require('net')
const Query = require('mcquery')

/**
 * Retrieves the status of a minecraft server.
 * 
 * @param {string} address The server address.
 * @param {number} port Optional. The port of the server. Defaults to 25565.
 * @returns {Promise.<Object>} A promise which resolves to an object containing
 * status information.
 */
exports.getStatus = function(address, port = 25565){

    if(port == null || port == ''){
        port = 25565
    }
    if(typeof port === 'string'){
        port = parseInt(port)
    }

    return new Promise((resolve, reject) => {
        var query = new Query("94.130.48.84", 45997)

        query.connect(function (err) {
            if (err) {
              console.error(err)
            } else {
              query.basic_stat(new function (err, stat)
                  {
                    if (err) {
                        console.error(err)
                      }
                      console.log('basicBack', stat)
                      resolve(
                      {
                          online: false
                      })
                  }
              )
            }
          })

        // socket.on('data', (data) => {
        //     if(data != null && data != ''){
        //         let server_info = data.toString().split('\x00\x00\x00')
        //         const NUM_FIELDS = 6
        //         if(server_info != null && server_info.length >= NUM_FIELDS){
        //             resolve({
        //                 online: true,
        //                 version: server_info[2].replace(/\u0000/g, ''),
        //                 motd: server_info[3].replace(/\u0000/g, ''),
        //                 onlinePlayers: server_info[4].replace(/\u0000/g, ''),
        //                 maxPlayers: server_info[5].replace(/\u0000/g,'')
        //             })
        //         } else {
        //             resolve({
        //                 online: false
        //             })
        //         }
        //     }
        //     socket.end()
        // })
    })

}