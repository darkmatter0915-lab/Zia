const { defineConfig } = require('@playwright/test');
module.exports=defineConfig({
 testDir:'./public/rift-forge/tests',testMatch:'art.spec.cjs',timeout:45000,workers:1,
 reporter:[['list'],['json',{outputFile:'test-results/rift-report.json'}]],
 use:{baseURL:'http://127.0.0.1:4187/rift-forge/',serviceWorkers:'block',browserName:'chromium',screenshot:'only-on-failure'},
 webServer:{command:'python3 -m http.server 4187 --directory public',url:'http://127.0.0.1:4187/rift-forge/',reuseExistingServer:!process.env.CI}
});
