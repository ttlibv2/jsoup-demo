// export const PROXY_CONFIG = {
  
//     '/en_US': {
//       target: 'https://web.ts24.com.vn',
//       secure: false,
//       logLevel: "debug",
//       byPass: (req, res, op) => {
//         console.log('------ byPass ---------')
//         console.log(req);
//       }

//     }
// };

// const PROXY_CONFIG = {

//   '/web': {
//      // context: ["/web"],
//       target: "https://web.ts24.com.vn",
//       secure: false,
//       logLevel: "debug",
//       pathRewrite: { '^/web/': '/en_US/'},
//       byPass: (req, res, op) => {
//         console.log(`--------- QQQ ---------`);
//       }
//   }
// };

// module.exports = PROXY_CONFIG;