var crc32 = require('./crc32.js')
// 编码库
var cryptoJsCore = require('crypto-js/core')
require('crypto-js/md5')
require('crypto-js/sha1')

function uploadApi (data, api) {
  var opts = {}
  if (typeof data === 'string') {
    opts.filePath = data
  } else if (typeof data === 'object') {
    opts = data
  } else {
    return Promise.reject(new Error('文件地址没找到'))
  }
  return readFile(opts.filePath)
    .then(function (arrayBuffer) {
      var wordArray = arrayBufferToWordArray(arrayBuffer)
      var sign = {
        fileMd5: cryptoJsCore.MD5(wordArray).toString(cryptoJsCore.enc.Hex),
        fileSha1: cryptoJsCore.SHA1(wordArray).toString(cryptoJsCore.enc.Hex),
        fileCrc32: crc32(crc32(new Uint8Array(arrayBuffer)), true).toUpperCase()
      }
      sign.filePartMd5Lower = (cryptoJsCore.MD5(sign.fileMd5.toLowerCase()).toString(cryptoJsCore.enc.Hex) + '-1').toUpperCase()
      sign.filePartMd5Upper = (cryptoJsCore.MD5(sign.fileMd5.toUpperCase()).toString(cryptoJsCore.enc.Hex) + '-1').toUpperCase()
      sign.manageType = opts.manageType || 'admin'
      sign.directory = opts.directory || 'file/wap/img/headimg'
      sign.authType = opts.authType || 'brand'
      sign.deviceType = 'html5'
      sign.fileSize = arrayBuffer.byteLength
      sign.lastModified = new Date().getTime() / 1000
      return api('/v1.0/api/upload/fileId').method('GET').send(sign).then(function (res) {
        if (res.data.isUploadEnd) {
          return res.data
        } else {
          var contentMd5 = cryptoJsCore.enc.Hex.parse(sign.fileMd5).toString(cryptoJsCore.enc.Base64)
          var fileInfo = {
            fileId: res.data.fileId,
            fileMd5: res.data.fileMd5,
            fileSha1: res.data.fileSha1,
            fileCrc32: res.data.fileCrc32,
            partSize: sign.fileSize,
            partLength: sign.fileSize,
            contentMd5: contentMd5,
            md5Base64: contentMd5,
            partNumber: 1
          }
          return api('/v1.0/api/upload/filePartInfo').method('GET').send(fileInfo)
            .then(function () {
              return api('/v1.0/api/upload/filePartMd5').method('GET').send(fileInfo)
            })
            .then(function (res) {
              return new Promise(function (resolve, reject) {
                wx.request({
                  url: res.data.url,
                  method: res.data.method,
                  header: res.data.headers,
                  data: arrayBuffer,
                  success: resolve,
                  fail: reject
                })
              })
            })
            .then(function () {
              return api('/v1.0/api/upload/complete').method('POST').send(fileInfo)
            })
            .then(function (res1) {
              var data = res1.data
              if (data.isUploadEnd) {
                res.data.isUploadEnd = data.isUploadEnd
                return res.data
              } else {
                return Promise.reject(new Error('失败'))
              }
            })
        }
      })
    })
}

function readFile (filePath) {
  return new Promise(function (resolve, reject) {
    wx.getFileSystemManager().readFile({
      filePath: filePath,
      success: function (res) {
        resolve(res.data)
      },
      fail: function (e) {
        reject(e)
      }
    })
  })
}

function arrayBufferToWordArray (arrayBuffer) {
  var fullWords = Math.floor(arrayBuffer.byteLength / 4)
  var bytesLeft = arrayBuffer.byteLength % 4

  var u32 = new Uint32Array(arrayBuffer, 0, fullWords)
  var u8 = new Uint8Array(arrayBuffer)
  var pad
  var cp = []
  var i = 0
  for (i = 0; i < fullWords; ++i) {
    cp.push(swapendian32(u32[i]))
  }

  if (bytesLeft) {
    pad = 0
    i = bytesLeft
    for (i = bytesLeft; i > 0; --i) {
      pad = pad << 8
      pad += u8[u8.byteLength - i]
    }
    i = 0
    for (i = 0; i < 4 - bytesLeft; ++i) {
      pad = pad << 8
    }

    cp.push(pad)
  }
  return cryptoJsCore.lib.WordArray.create(cp, arrayBuffer.byteLength)
}

function swapendian32 (val) {
  return (((val & 0xFF) << 24) | ((val & 0xFF00) << 8) | ((val >> 8) & 0xFF00) | ((val >> 24) & 0xFF)) >>> 0
}

module.exports = uploadApi

module.exports['default'] = module.exports
