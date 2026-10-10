const { defineConfig } = require('@playwright/test');
module.exports=defineConfig({
 testDir:'./public/rift-forge/tests',testMatch:['art.spec.cjs','mobile.spec.cjs','update.spec.cjs','polish.spec.cjs','encounters.spec.cjs','elements.spec.cjs','progression.spec.cjs','chapter.spec.cjs','characters.spec.cjs','readability.spec.cjs','loading.spec.cjs'],timeout:45000,workers:1,
 reporter:[['list'],['json',{outputFile:'test-results/rift-report.json'}]],
 use:{baseURL:'http://127.0.0.1:4187/rift-forge/',serviceWorkers:'block',screenshot:'only-on-failure'},
 projects:[{name:'chromium',use:{browserName:'chromium'}},{name:'webkit',use:{browserName:'webkit'}}],
 webServer:{command:`${process.platform==='win32'?'python':'python3'} -m http.server 4187 --bind 127.0.0.1 --directory public`,url:'http://127.0.0.1:4187/rift-forge/',reuseExistingServer:!process.env.CI}
});
