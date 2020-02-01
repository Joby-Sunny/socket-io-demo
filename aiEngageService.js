const path = require('path');
const querystring = require('querystring');
console.log('Progress , INITIALIZED glob');
var glob = {
  browserG: {}
};
const jsonSql = require('json-sql')();
const cheerio = require('cheerio');
const request = require('request-promise-native');
const Buffer = require('buffer/').Buffer;
var twilioUtil = require('../util/twilioUtil.js');
var sendgridUtil = require('../util/sendgridUtil.js');
const _ = require('lodash');
const responseHelper = require('../util/commonHelper');
const baseService = require('./baseService.js');
const pipl_service = require('./piplService.js').getInst();
//const jobdiva_service = require('./jobDivaService.js').getInst();
var jobDivaUtil = require('./../util/jobDivaUtil.js');
const debug = require('debug');
const puppeteer = require('puppeteer');
//var monsterCookiesFilePath = "E:\\Ai Engage\\pulse\\Server\\monster_cookies\\";
//var monsterCookiesFilePath = "./../monster_cookies/";
//var monsterCookiesFilePath = path.join(__dirname, "..", "cookies_");
var monsterCookiesFilePath = path.join(__dirname, '..', 'monster_cookies/');

const jsonfile = require('fs');

const redis = require('../core/redisConnect');
const config = require('../config.json');
const model = require('../db/models/aiEngageModel').getInst();
const util = require('util');
const rPub = new redis.AsyncRedis('vms');
var candidate_Inserted_count = 0;
var candidate_saved_count = 1;
var candidate_total_count = 1;
const DEFAULT_NAVIGATION_TIMEOUT = 45000;
var PAGE_WAIT_UNTIL_0 = {
  waitUntil: ['load', 'domcontentloaded'],
  timeout: DEFAULT_NAVIGATION_TIMEOUT
};

function Service() {
  baseService.call(this);
}
util.inherits(Service, baseService);

Service.prototype.mainPuppetter = function(user_id, callback) {
  if (glob.browserG.hasOwnProperty(user_id)) {
    console.log('Progress , browser exist for ' + user_id);
    callback(glob.browserG[user_id]);
  } else {
    puppeteer
      .launch({
        headless: true,
        ignoreHTTPSErrors: true,
        userDataDir: '/home/aptask/chromeData',
        args: [
          `--window-size=1920,1200`,
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-gpu',
          '--remote-debugging-port=9222',
          '--remote-debugging-address=0.0.0.0'
        ]
      })
      .then(async browser => {
        console.log(
          'Progress , SUCCESSFULLY CREATING browser with ID ' + user_id,
          browser
        );
        glob.browserG[user_id] = browser;
        callback(browser);
      })
      .catch(err => {
        console.log('Progress , FAILED CREATING browser with ID ' + user_id);
        return resolve('TRYAGAIN');
      });
  }
};

Service.prototype.updateLoginProgress = function(progress) {
  (async () => {
    var _this = this;

    // function abortProgress() {
    //     progress !== null && progress.emit('error', 'Aborted')
    // }

    // function updateProgress() {
    //     progress !== null && progress.emit('percentage', percent)
    // }

    // let abort = false
    // if (progress instanceof EventEmitter) {
    //     progress.on('abort', () => {
    //         abort = true
    //     })
    // } else {
    //     progress = null
    // }
    // let percent = 10
    // updateProgress();
    //rPub.publish(progress, { event: 'message', value: "Checking Monster user for login" })
    try {
      var logged_user_id = '';
      var logged_user = '';
      var logged_user_name = '';
      var global_pass = '';
      var login_res_msg = '';
      var isLoggedIn = false;
      model
        .getMnsterFreeUsers()
        .then(user_free_result => {
          (async () => {
            await _this._sleep(1000);
            //setTimeout(function() {
            //progress.emit('message', "Checking Monster user for login");
            rPub.publish(progress, {
              event: 'message',
              value: 'Checking Monster user for login'
            });
            //}, 1000);
            if (user_free_result.length == 0) {
              isLoggedIn = false;
              login_res_msg =
                'There are no free monster login ids available. Please contact admin.';
              //setTimeout(function() {
              //progress.emit('message', login_res_msg);
              //progress.emit('done', 'There are no free monster login ids available. Please contact admin.');
              rPub.publish(progress, {
                event: 'message',
                value: login_res_msg
              });
              rPub.publish(progress, {
                event: 'done',
                value:
                  'There are no free monster login ids available. Please contact admin.'
              });
              //}, 1000);
            } else {
              //setTimeout(function() {
              //progress.emit('message', "Take Monster User to login ");
              //progress.emit('message', "UserName : " + logged_user);
              //progress.emit('message', "Opening monster login page");

              //}, 1000);

              logged_user_id = user_free_result[0].user_id;
              logged_user = user_free_result[0].user_name;
              global_pass = user_free_result[0].user_password;
              rPub.publish(progress, {
                event: 'message',
                value: 'Take Monster User to login'
              });
              rPub.publish(progress, {
                event: 'message',
                value: 'UserName : ' + logged_user
              });
              rPub.publish(progress, {
                event: 'message',
                value: 'Opening monster login page'
              });
              var logged_user_name = '';
              console.log(
                'Progress CALLING _this.mainPuppetter ' + logged_user_id
              );
              _this.mainPuppetter(logged_user_id, function(browser) {
                console.log(
                  'Progress logged_user_id>>>>>>',
                  logged_user_id,
                  Object.keys(glob.browserG)
                );
                glob.browserG[logged_user_id].newPage().then(async page => {
                  try {
                    const login_URL =
                      'https://hiring.monster.com/SignIn.aspx?redirect=https%3a%2f%2fhiring.monster.com%2f%3fHasUserAccount%3d2&intcid=HEADER_login';
                    await page.addScriptTag({
                      url: 'https://code.jquery.com/jquery-3.4.1.min.js'
                    });
                    await page.setUserAgent(
                      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/44.0.2403.157 Safari/537.36'
                    );
                    await page.goto(login_URL, {waitUntil: 'networkidle0'});
                    await page.waitFor(1000);
                    const user_name = await page.evaluate(() => {
                      var username_element = $('input[title="User Name"]');
                      return username_element.length;
                    });
                    const password = await page.evaluate(() => {
                      var password_element = $('input[title="Password"]');
                      return password_element.length;
                    });
                    if (user_name > 0) {
                      await page.type(
                        'input[title="User Name"]',
                        logged_user
                      );
                      //progress.emit('message', "Entered user name");
                      rPub.publish(progress, {
                        event: 'message',
                        value: 'Entered user name'
                      });
                    } else {
                      //reject(responseHelper.generateErrorResponse(err));
                      //progress.emit('message', "oops! something went wrong..");
                      //progress.emit('done', 'Internal Server Error');
                      rPub.publish(progress, {
                        event: 'message',
                        value: 'oops! something went wrong..'
                      });
                      rPub.publish(progress, {
                        event: 'done',
                        value: 'Internal Server Error'
                      });
                    }
                    if (password > 0) {
                      await page.type('input[title="Password"]', global_pass);
                      //progress.emit('message', "Entered password");
                      rPub.publish(progress, {
                        event: 'message',
                        value: 'Entered password'
                      });
                    } else {
                      //progress.emit('message', "oops! something went wrong");
                      //progress.emit('done', 'Internal Server Error');
                      rPub.publish(progress, {
                        event: 'message',
                        value: 'oops! something went wrong'
                      });
                      rPub.publish(progress, {
                        event: 'done',
                        value: 'Internal Server Error'
                      });
                    }
                    const submit_button = await page.evaluate(() => {
                      var submit_element = $('button[title = "Sign In"]');
                      return submit_element.length;
                    });
                    if (submit_button > 0) {
                      await page.click('button[title = "Sign In"]');
                      //progress.emit('message', "Submit monster Login");
                      rPub.publish(progress, {
                        event: 'message',
                        value: 'Submit monster Login'
                      });
                    }
                    await page.waitForNavigation(PAGE_WAIT_UNTIL_0);
                    //await _this._sleep(4000);
                    await page.waitForSelector('.navbar-username', {
                      timeout: 6000
                    });
                    const loggedElementsCounts = await page.evaluate(() => {
                      const element = document.querySelectorAll(
                        '.navbar-username'
                      );
                      if (element.length > 0) {
                        return document.querySelectorAll(
                          '.navbar-username'
                        )[0].innerText;
                      } else {
                        return '';
                      }
                    });
                    // await _this._sleep(2000)

                    console.log(
                      'loggedElementsCounts>>>',
                      loggedElementsCounts
                    );
                    if (loggedElementsCounts != '') {
                      isLoggedIn = true;

                      if (page.url().indexOf('Challenge.aspx') != -1) {
                        //progress.emit('captcha_message', "Captcha Recieved");
                        rPub.publish(progress, {
                          event: 'captcha_message',
                          value: 'Captcha Recieved'
                        });
                        await page.waitForSelector('#questionPad', {
                          timeout: 6000
                        });
                        const captchaQuetion = await page.evaluate(() => {
                          const element = $('#questionPad');
                          return element.length;
                        });
                        if (captchaQuetion > 0) {
                          //progress.emit('captcha_message', "Captcha quetion Recieved");
                          rPub.publish(progress, {
                            event: 'captcha_message',
                            value: 'Captcha quetion Recieved'
                          });
                          captchaQuetionText = await page.evaluate(() => {
                            const quetionText = $(
                              '#ctl00_ctl00_ContentPlaceHolderBase_ContentPlaceHolder1_ctl00_lblQuestion'
                            ).text();
                            return quetionText;
                          });
                          //await _this._sleep(2000)
                          //progress.emit('loggedUserInfoForCaptcha', JSON.stringify({ logged_user_id, logged_user_name }));
                          //progress.emit('captcha_Quetion_message', captchaQuetionText);
                          rPub.publish(progress, {
                            event: 'loggedUserInfoForCaptcha',
                            value: JSON.stringify({
                              logged_user_id,
                              logged_user_name
                            })
                          });
                          //rPub.publish(progress, { event: 'captcha_Quetion_message', value: captchaQuetionText });
                          _this
                            .monsterAutoCaptchaAnswer('aptask', page)
                            .then(captcha_res => {
                              if (
                                captcha_res &&
                                captcha_res.captcha_resolve == true
                              ) {
                                rPub.publish(progress, {
                                  event: 'message',
                                  value: 'Captcha not Recieved'
                                });
                                logged_user_name = loggedElementsCounts;
                                login_res_msg = 'Successfully Logged in';
                                rPub.publish(progress, {
                                  event: 'message',
                                  value: login_res_msg
                                });
                                rPub.publish(progress, {
                                  event: 'loggedUserInfo',
                                  value: JSON.stringify({
                                    logged_user_id,
                                    logged_user_name
                                  })
                                });
                                rPub.publish(progress, {
                                  event: 'done',
                                  value: 'success'
                                });
                                model
                                  .updateMonsterUserStatus(
                                    logged_user_id,
                                    'inuse'
                                  )
                                  .then(result => {})
                                  .catch(err => {
                                    reject(
                                      responseHelper.generateErrorResponse(
                                        err
                                      )
                                    );
                                  });
                              } else {
                                rPub.publish(progress, {
                                  event: 'message',
                                  value: captcha_res.error
                                });
                              }
                            });
                        }
                      } else {
                        //progress.emit('message', "Captcha not Recieved");
                        rPub.publish(progress, {
                          event: 'message',
                          value: 'Captcha not Recieved'
                        });
                        logged_user_name = loggedElementsCounts;
                        login_res_msg = 'Successfully Logged in';
                        //progress.emit('message', login_res_msg);
                        //progress.emit('loggedUserInfo', JSON.stringify({ logged_user_id, logged_user_name }));
                        //progress.emit('done', 'success');
                        rPub.publish(progress, {
                          event: 'message',
                          value: login_res_msg
                        });
                        rPub.publish(progress, {
                          event: 'loggedUserInfo',
                          value: JSON.stringify({
                            logged_user_id,
                            logged_user_name
                          })
                        });
                        rPub.publish(progress, {
                          event: 'done',
                          value: 'success'
                        });
                        model
                          .updateMonsterUserStatus(logged_user_id, 'inuse')
                          .then(result => {})
                          .catch(err => {
                            reject(responseHelper.generateErrorResponse(err));
                          });
                      }

                      const cookiesObject = await page.cookies();
                      var cookiesFilePath =
                        monsterCookiesFilePath +
                        'monster_' +
                        logged_user_id +
                        '.json';
                      jsonfile.writeFile(
                        cookiesFilePath,
                        JSON.stringify(cookiesObject),
                        {spaces: 2},
                        function(err) {
                          if (err) {
                          }
                        }
                      );
                    } else {
                      isLoggedIn = false;
                      const loggedFailElementsCounts = await page.evaluate(
                        () => {
                          const element = document.querySelectorAll(
                            '#ctl00_ctl00_ContentPlaceHolderBase_cphBody_ValidationSummary1'
                          );
                          return element.length;
                        }
                      );
                      if (loggedFailElementsCounts > 0) {
                        login_res_msg = await page.evaluate(() => {
                          const element = document.querySelectorAll(
                            '#ctl00_ctl00_ContentPlaceHolderBase_cphBody_ValidationSummary1'
                          );
                          return element[0].innerText;
                        });
                        // progress.emit('message', "login failed");
                        //progress.emit('message', login_res_msg);
                        //progress.emit('done', 'Login Failed');
                        //progress.emit('message', "Login Failed");
                        rPub.publish(progress, {
                          event: 'message',
                          value: login_res_msg
                        });
                        rPub.publish(progress, {
                          event: 'done',
                          value: 'Login Failed'
                        });
                        rPub.publish(progress, {
                          event: 'message',
                          value: 'Login Failed'
                        });
                        glob.browserG[logged_user_id].close();
                      } else {
                        //progress.emit("message", "Checking security question");
                        rPub.publish(progress, {
                          event: 'message',
                          value: 'Checking security question'
                        });
                        const securityQuetionElement = await page.evaluate(
                          () => {
                            const element = document.querySelectorAll(
                              '#ctl00_ctl00_ContentPlaceHolderBase_ContentPlaceHolder1_pnlMessage'
                            );
                            return element.length;
                          }
                        );

                        if (securityQuetionElement > 0) {
                          login_res_msg = await page.evaluate(() => {
                            const element = document.querySelectorAll(
                              '#ctl00_ctl00_ContentPlaceHolderBase_ContentPlaceHolder1_pnlMessage'
                            );
                            return element[0].innerText;
                          });
                          // progress.emit('message', "login failed");
                          // progress.emit('message', login_res_msg);
                          // progress.emit('done', 'Login Failed');
                          // progress.emit('message', "Login Failed");
                          rPub.publish(progress, {
                            event: 'message',
                            value: login_res_msg
                          });
                          rPub.publish(progress, {
                            event: 'done',
                            value: 'Login Failed'
                          });
                          rPub.publish(progress, {
                            event: 'message',
                            value: 'Login Failed'
                          });
                          glob.browserG[logged_user_id].close();
                        } else {
                          isLoggedIn = false;
                          const loggedFailElementsCounts = await page.evaluate(
                            () => {
                              const element = document.querySelectorAll(
                                '#ctl00_ctl00_ContentPlaceHolderBase_cphBody_ValidationSummary1'
                              );
                              return element.length;
                            }
                          );
                          if (loggedFailElementsCounts > 0) {
                            login_res_msg = await page.evaluate(() => {
                              const element = document.querySelectorAll(
                                '#ctl00_ctl00_ContentPlaceHolderBase_cphBody_ValidationSummary1'
                              );
                              return element[0].innerText;
                            });
                            // progress.emit('message', "login failed");
                            // progress.emit('message', login_res_msg);
                            // progress.emit('done', 'Login Failed');
                            // progress.emit('message', "Login Failed");
                            rPub.publish(progress, {
                              event: 'message',
                              value: login_res_msg
                            });
                            rPub.publish(progress, {
                              event: 'done',
                              value: 'Login Failed'
                            });
                            rPub.publish(progress, {
                              event: 'message',
                              value: 'Login Failed'
                            });
                            glob.browserG[logged_user_id].close();
                          }
                        }
                      }
                    }
                    if (isLoggedIn == false) {
                      //progress.emit('message', "No security question found");
                      rPub.publish(progress, {
                        event: 'message',
                        value: 'No security question found'
                      });
                    }
                    //progress.emit('done', 'Login Failed');
                    //rPub.publish(progress, { event: 'done', value: "Login Failed" });
                  } catch (err) {
                    //progress.emit('message', "Login Failed - " + err);
                    rPub.publish(progress, {
                      event: 'message',
                      value: 'Login Failed - ' + err
                    });
                    isLoggedIn = false;
                    const loggedFailElementsCounts = await page.evaluate(
                      () => {
                        const element = document.querySelectorAll(
                          '#ctl00_ctl00_ContentPlaceHolderBase_cphBody_ValidationSummary1'
                        );
                        return element.length;
                      }
                    );
                    if (loggedFailElementsCounts > 0) {
                      login_res_msg = await page.evaluate(() => {
                        const element = document.querySelectorAll(
                          '#ctl00_ctl00_ContentPlaceHolderBase_cphBody_ValidationSummary1'
                        );
                        return element[0].innerText;
                      });
                      //progress.emit('message', login_res_msg);
                      //progress.emit('done', login_res_msg);
                      rPub.publish(progress, {
                        event: 'message',
                        value: login_res_msg
                      });
                      rPub.publish(progress, {
                        event: 'done',
                        value: login_res_msg
                      });
                      glob.browserG[logged_user_id].close();
                    }
                    //progress.emit('done', 'Login Failed');
                    rPub.publish(progress, {
                      event: 'done',
                      value: 'Login Failed'
                    });
                    glob.browserG[logged_user_id].close();
                  }
                });
              });
            }
          })();
        })
        .catch(err => {
          rPub.publish(progress, {event: 'done', value: err});
          rPub.publish(progress, {
            event: 'message',
            value: 'Unexpected Error - ' + err
          });
          //reject(responseHelper.generateErrorResponse(err));
        });
    } catch (err) {
      //progress.emit('done', err);
      //progress.emit('message', "Unexpected Error - " + err);
      rPub.publish(progress, {event: 'done', value: err});
      rPub.publish(progress, {
        event: 'message',
        value: 'Unexpected Error - ' + err
      });
    }
  })();
};

Service.prototype.getcandidateListByCampaign = function(Param_id) {
  return new Promise(function(resolve, reject) {
    const candidate_response_obj = {};
    return model
      .getCandidateListByCampaign(Param_id)
      .then(cadidate_result => {
        candidate_response_obj.result = cadidate_result;
        return model
          .getCampaignUserinfo(Param_id)
          .then(campaign_data_result => {
            if (campaign_data_result.length > 0) {
              candidate_response_obj.campaign_name =
                campaign_data_result[0].campaign_name;
              candidate_response_obj.user_name =
                campaign_data_result[0].user_name;
            } else {
              candidate_response_obj.campaign_name = '';
              candidate_response_obj.user_name = '';
            }
            resolve(
              responseHelper.generateResponse(
                'Success',
                candidate_response_obj || {}
              )
            );
          })
          .catch(err => {
            reject(responseHelper.generateErrorResponse(err));
          });
      })
      .catch(err => {
        reject(responseHelper.generateErrorResponse(err));
        // reject(responseHelper.generateErrorResponse(err));
      });
  });
};

Service.prototype.sendSMSToCandidateByCampaign = function(
  campaign_id,
  Temp_id
) {
  var count_sms_sent = 0;
  var count_sms_fail = 0;
  var candidate_result = [];
  var _this = this;
  return new Promise(function(resolve, reject) {
    model
      .getTemplates(Temp_id)
      .then(template_result => {
        if (template_result.length > 0) {
          var Sms_text = template_result[0].temp_body;
          model
            .getCandidatesByCampaign(campaign_id)
            .then(candidate_result_arr => {
              candidate_result = candidate_result_arr;
              if (candidate_result.length > 0) {
                var smsStatusCallbackURL = '';
                var candidateResultPromiseArr = [];
                for (var i12 = 0; i12 < candidate_result.length; i12++) {
                  candidateResultPromiseArr.push(
                    new Promise(function(resolve, reject) {
                      _this
                        .sendSMSSingleCandidate(
                          candidate_result[i12],
                          Sms_text
                        )
                        .then(candidateMailObj => {
                          resolve(candidateMailObj);
                        });
                    })
                  );
                }

                Promise.all(candidateResultPromiseArr).then(mailResArray => {
                  for (var i13 = 0; i13 < mailResArray.length; i13++) {
                    var sent_status = mailResArray[i13]['sent'];
                    var candidate_id = mailResArray[i13]['candidate_id'];
                    if (sent_status == true) {
                      /*Update candidate status for sent email */
                      count_sms_sent++;
                      model
                        .updateCandidatesStatus(candidate_id)
                        .then(result => {});
                    } else {
                      /* Update candidate status for fail email */
                      count_sms_fail++;
                      model
                        .updateCandidatesFailStatus(
                          mailResArray[i13]['message'],
                          candidate_id
                        )
                        .then(result => {});
                    }
                  }

                  var result = {
                    count_candidate: candidate_result.length,
                    count_sms_fail: count_sms_fail,
                    count_sms_sent: count_sms_sent
                  };
                  resolve(
                    responseHelper.generateResponse('Success', result || {})
                  );
                });
              } else {
                var result1 = {
                  count_candidate: candidate_result.length,
                  count_sms_fail: count_sms_fail,
                  count_sms_sent: count_sms_sent
                };
                resolve(
                  responseHelper.generateResponse('Success', result1 || {})
                );
              }
            })
            .catch(err => {
              reject(responseHelper.generateErrorResponse(err));
            });
        } else {
          var result2 = {
            count_candidate: candidate_result.length,
            count_sms_fail: count_sms_fail,
            count_sms_sent: count_sms_sent
          };
          resolve(responseHelper.generateResponse('Success', result2 || {}));
        }
      })
      .catch(err => {
        reject(responseHelper.generateErrorResponse(err));
      });
  });
};

Service.prototype.sendSMSSingleCandidate = function(candidate_obj, Sms_text) {
  return new Promise((resolve, reject) => {
    var candidate_email = candidate_obj['candidate_email'];
    var firstName = candidate_obj['candidate_first_name'];
    var lastName = candidate_obj['candidate_last_name'];
    var candidate_id = candidate_obj['id'];
    var candidate_mobile = candidate_obj['candidate_mobile'];
    Sms_text = Sms_text.replace(/{first_name}/g, firstName);
    Sms_text = Sms_text.replace(/{last_name}/g, lastName);
    if (candidate_mobile && candidate_mobile.trim() != '-') {
      var candidate_mobile = '+917263950268';
      var message = {
        To_smsnum: candidate_mobile,
        From_smsnum: config.twilio.fromNumber,
        Sms_text: Sms_text
      };
      twilioUtil
        .sendSms(message)
        .then(userList => {
          if (userList && userList.status == 'queued') {
            resolve({
              sent: true,
              message: userList.status,
              candidate_id: candidate_id
            });
          } else {
            resolve({
              sent: false,
              message: userList.status,
              candidate_id: candidate_id
            });
          }
        })
        .catch(err => {
          console.log('err >>>>> ', err);
          resolve({sent: false, message: err, candidate_id: candidate_id});
        });
    } else {
      resolve({
        sent: false,
        message: 'Candidate Mobile no missing',
        candidate_id: candidate_id
      });
    }
  });
};

Service.prototype.sendEmailToCandidateByCampaign = function(
  campaign_id,
  Temp_id
) {
  var count_email_sent = 0;
  var count_email_fail = 0;
  var candidate_result = [];
  var _this = this;

  return new Promise(function(resolve, reject) {
    model
      .getTemplatesById(Temp_id)
      .then(template_result => {
        if (template_result.length > 0) {
          var email_text = template_result[0].temp_body;
          model
            .getPendingEmailCandidates(campaign_id)
            .then(candidate_result_arr => {
              candidate_result = candidate_result_arr;
              if (candidate_result.length > 0) {
                var smsStatusCallbackURL = '';
                var candidateResultPromiseArr = [];
                for (var i12 = 0; i12 < candidate_result.length; i12++) {
                  candidateResultPromiseArr.push(
                    new Promise(function(resolve, reject) {
                      _this
                        .sendEmailSingleCandidate(
                          candidate_result[i12],
                          email_text
                        )
                        .then(candidateMailObj => {
                          resolve(candidateMailObj);
                        });
                    })
                  );
                }

                Promise.all(candidateResultPromiseArr).then(mailResArray => {
                  for (var i13 = 0; i13 < mailResArray.length; i13++) {
                    var sent_status = mailResArray[i13]['sent'];
                    var candidate_id = mailResArray[i13]['candidate_id'];
                    if (sent_status == true) {
                      /*Update candidate status for sent email */
                      count_email_sent++;
                      model
                        .updateCandidatesEmailStatus(candidate_id)
                        .then(result => {});
                    } else {
                      /* Update candidate status for fail email */
                      count_email_fail++;
                      model
                        .updateCandidatesEmailFailStatus(
                          mailResArray[i13]['message'],
                          candidate_id
                        )
                        .then(result => {});
                    }
                  }

                  var result2 = {
                    count_candidate: candidate_result.length,
                    count_email_fail: count_email_fail,
                    count_email_sent: count_email_sent
                  };
                  resolve(
                    responseHelper.generateResponse('Success', result2 || {})
                  );
                });
              } else {
                var result3 = {
                  count_candidate: candidate_result.length,
                  count_email_fail: count_email_fail,
                  count_email_sent: count_email_sent
                };
                resolve(
                  responseHelper.generateResponse('Success', result3 || {})
                );
              }
            })
            .catch(err => {
              console.log('catch getPendingEmailCandidates err >> ', err);
              reject(responseHelper.generateErrorResponse(err));
            });
        } else {
          var result4 = {
            count_candidate: candidate_result.length,
            count_email_fail: count_email_fail,
            count_email_sent: count_email_sent
          };
          resolve(responseHelper.generateResponse('Success', result4 || {}));
        }
      })
      .catch(err => {
        console.log('catch getTemplatesById err >> ', err);
        reject(responseHelper.generateErrorResponse(err));
      });
  });
};

Service.prototype.sendEmailSingleCandidate = function(
  candidate_obj,
  email_text
) {
  return new Promise((resolve, reject) => {
    var candidate_email = candidate_obj['candidate_email'];
    var firstName = candidate_obj['candidate_first_name'];
    var lastName = candidate_obj['candidate_last_name'];
    var candidate_id = candidate_obj['id'];
    email_text = email_text.replace(/{first_name}/g, firstName);
    email_text = email_text.replace(/{last_name}/g, lastName);
    if (candidate_email && candidate_email.trim() != '-') {
      var fromEmail = 'rituH@aptask.com';
      var message = {
        from: fromEmail,
        to: candidate_email,
        emailBody: email_text,
        subject: 'Hello - ' + candidate_email,
        bcc: 'rituH@aptask.com,taj@aptask.com,nilaypsoni@gmail.com'
      };
      // bcc:'RituH@aptask.com,taj@aptask.com'
      sendgridUtil
        .sendMails(message)
        .then(mailRes => {
          if (mailRes && mailRes.message == 'success') {
            resolve({
              sent: true,
              message: mailRes.message,
              candidate_id: candidate_id
            });
          } else {
            resolve({
              sent: false,
              message: mailRes.message,
              candidate_id: candidate_id
            });
          }
        })
        .catch(err => {
          resolve({sent: false, message: err, candidate_id: candidate_id});
        });
    } else {
      resolve({
        sent: false,
        message: 'Candidate Email missing',
        candidate_id: candidate_id
      });
    }
  });
};

Service.prototype.monster_img_captcha = function(req, res) {
  (async () => {
    let img_quetionCaptcha = req.body.captcha_imganswer;
    let user_id = req.body.user_id;
    var captcha_resolve = false;
    var captchaValidateText = '';
    var captchaImgText = '';
    var targets = await glob.browserG[user_id].targets();
    var current_page = '';

    for (let i = targets.length - 1; i > 0; i--) {
      const page = await targets[i];
      if (
        page.url().indexOf('https://hiring.monster.com/fraud/captcha.aspx') !=
        -1
      ) {
        current_page = page;
        break;
      }
    }

    var captcha_resolve = false;
    var captchaValidate_img_Text = '';
    var captchaImgText = '';
    if (current_page != '') {
      current_page.page().then(async current_page => {
        try {
          await current_page.type(
            '#ctl00_ctl00_ContentPlaceHolderBase_ContentPlaceHolder1_ctlCaptcha_txtCaptchaCode',
            img_quetionCaptcha
          );
          await current_page.click(
            '.ButtonBlueSecureCommon.ButtonBlueSecureText'
          );
          await current_page.waitFor(4000);

          /* Check entered Captcha valid or not */
          (async () => {
            try {
              const captchaImg = await current_page.evaluate(() => {
                const element = document.querySelectorAll(
                  '#ctl00_ctl00_ContentPlaceHolderBase_ContentPlaceHolder1_ctlCaptcha_imgCaptcha'
                );
                return element.length;
              });
              if (captchaImg > 0) {
                captcha_resolve = false;
              } else {
                captcha_resolve = true;
              }
              if (captcha_resolve == false) {
                (async () => {
                  if (captchaImg > 0) {
                    captchaImgText = await current_page.evaluate(() => {
                      const imageSrc = document.getElementById(
                        'ctl00_ctl00_ContentPlaceHolderBase_ContentPlaceHolder1_ctlCaptcha_imgCaptcha'
                      ).src;
                      return imageSrc;
                    });
                    captchaValidateText = await current_page.evaluate(() => {
                      const quetionText = document.getElementById(
                        'ctl00_ctl00_ContentPlaceHolderBase_ValidationSummary1'
                      ).innerText;
                      return quetionText;
                    });
                  }
                  res.send({
                    captcha_resolve: captcha_resolve,
                    captchaValidateText: captchaValidateText,
                    captchaImgText: captchaImgText
                  });
                })();
              } else {
                res.send({
                  captcha_resolve: captcha_resolve,
                  captchaValidateText: captchaValidateText,
                  captchaImgText: captchaImgText
                });
              }
            } catch (err) {}
          })();
        } catch (err) {
          res.send({
            captcha_resolve: captcha_resolve,
            captchaValidateText: captchaValidateText,
            captchaImgText: captchaImgText
          });
        }
      });
    } else {
      res.send({
        captcha_resolve: captcha_resolve,
        captchaValidateText: captchaValidateText,
        captchaImgText: captchaImgText
      });
    }
  })();
};

Service.prototype.monsterAutoCaptchaAnswer = function(captchaAnswer, page) {
  return new Promise(function(resolve, reject) {
    (async () => {
      var captcha_resolve = false;
      var captchaValidateText = '';
      var captchaQuetionText = '';
      try {
        await page.type(
          '#ctl00_ctl00_ContentPlaceHolderBase_ContentPlaceHolder1_ctl00_txtAnswer',
          captchaAnswer
        );
        await page.click(
          '#ctl00_ctl00_ContentPlaceHolderBase_ContentPlaceHolder1_ctl00_btnEnter'
        );
        await page.waitFor(4000);
        (async () => {
          try {
            captchaValidateText = await page.evaluate(() => {
              var element_text = '';
              var valid_element = document.getElementById(
                'answer-validation'
              );
              if (valid_element != null) {
                element_text = valid_element.innerText;
              }
              return element_text;
            });
            console.log('captchaValidateText >> ', captchaValidateText);
            if (captchaValidateText != '') {
              captcha_resolve = false;
            } else {
              captcha_resolve = true;
            }
            if (captcha_resolve == false) {
              (async () => {
                captchaQuetionText = await page.evaluate(() => {
                  var quetionText = '';
                  var valid_element = document.getElementById('questionPad');
                  if (valid_element != null) {
                    quetionText = valid_element.innerText;
                  }
                  return quetionText;
                });
                resolve({
                  captcha_resolve: captcha_resolve,
                  error: 'ERROR: Captcha failed',
                  captchaValidateText: captchaValidateText,
                  captchaQuetionText: captchaQuetionText
                });
              })();
            } else {
              const loggedFailElementsCounts = await page.evaluate(() => {
                const element = document.querySelectorAll(
                  '#ctl00_ctl00_ContentPlaceHolderBase_cphBody_ValidationSummary1'
                );
                return element.length;
              });
              if (loggedFailElementsCounts > 0) {
                captchaValidateText = await page.evaluate(() => {
                  const element = document.querySelectorAll(
                    '#ctl00_ctl00_ContentPlaceHolderBase_cphBody_ValidationSummary1'
                  );
                  return element[0].innerText;
                });
                captcha_resolve = false;
                resolve({
                  captcha_resolve: captcha_resolve,
                  error: 'ERROR: Captcha failed',
                  captchaValidateText: captchaValidateText,
                  captchaQuetionText: captchaQuetionText
                });
              } else {
                captcha_resolve = true;
                resolve({
                  captcha_resolve: captcha_resolve,
                  error: '',
                  captchaValidateText: captchaValidateText,
                  captchaQuetionText: captchaQuetionText
                });
              }
            }
          } catch (err) {
            console.log('page async catch err', err);
            rPub.publish(progress, {
              event: 'message',
              value: 'ERROR:oops! something went wrong..'
            });
            resolve({
              captcha_resolve: captcha_resolve,
              error: 'ERROR:oops! something went wrong..' + err,
              captchaValidateText: captchaValidateText,
              captchaQuetionText: captchaQuetionText
            });
          }
        })();
      } catch (err) {
        console.log('page catch err', err);
        rPub.publish(progress, {
          event: 'message',
          value: 'ERROR:oops! something went wrong..'
        });
        resolve({
          captcha_resolve: captcha_resolve,
          error: 'ERROR:oops! something went wrong..' + err,
          captchaValidateText: captchaValidateText,
          captchaQuetionText: captchaQuetionText
        });
      }
    })();
  });
};

Service.prototype.check_employeeLogin = function(username, password) {
  return new Promise(function(resolve, reject) {
    return model
      .CheckEmaployeeLogin(username, password)
      .then(result => {
        resolve(responseHelper.generateResponse('Success', result || {}));
      })
      .catch(err => {
        reject(responseHelper.generateErrorResponse(err));
        // reject(responseHelper.generateErrorResponse(err));
      });
  });
};

Service.prototype.delete_camplist = function(campaign_id) {
  return new Promise(function(resolve, reject) {
    return model
      .DeleteCampaignList(campaign_id)
      .then(result => {
        resolve(responseHelper.generateResponse('Success', result || {}));
      })
      .catch(err => {
        reject(responseHelper.generateErrorResponse(err));
        // reject(responseHelper.generateErrorResponse(err));
      });
  });
};

Service.prototype.get_employee_campaignList = function(employee_id) {
  return new Promise(function(resolve, reject) {
    return model
      .getCampaignListByemployee(employee_id)
      .then(result => {
        resolve(responseHelper.generateResponse('Success', result || {}));
      })
      .catch(err => {
        reject(responseHelper.generateErrorResponse(err));
        // reject(responseHelper.generateErrorResponse(err));
      });
  });
};

Service.prototype.get_templateListSMS = function() {
  return new Promise(function(resolve, reject) {
    return model
      .GetTemplateSmsList()
      .then(result => {
        resolve(responseHelper.generateResponse('Success', result || {}));
      })
      .catch(err => {
        reject(responseHelper.generateErrorResponse(err));
      });
  });
};

Service.prototype.get_templateListEmail = function() {
  return new Promise(function(resolve, reject) {
    return model
      .GetTemplateEmailList()
      .then(result => {
        resolve(responseHelper.generateResponse('Success', result || {}));
      })
      .catch(err => {
        reject(responseHelper.generateErrorResponse(err));
      });
  });
};

Service.prototype.checkMonsterFreeUser = function(req, res, next) {
  var res_msg = '';
  var is_found_free = false;

  model
    .getMnsterFreeUsers()
    .then(user_free_result => {
      if (user_free_result.length == 0) {
        res_msg =
          'There are no free monster login ids available. Please contact Admin.';
      } else {
        is_found_free = true;
        res_msg = 'Found free user successfully';
      }
      res.send({
        res_msg: res_msg,
        is_found_free: is_found_free
      });
    })
    .catch(err => {
      reject(responseHelper.generateErrorResponse(err));
    });
};

/*logout service*/
Service.prototype.updateLogoutProgress = function(progress, user_id) {
  // function abortProgress() {
  //     progress !== null && progress.emit('error', 'Aborted')
  // }

  // function updateProgress() {
  //     progress !== null && progress.emit('percentage', percent)
  // }
  // let abort = false
  // if (progress instanceof EventEmitter) {
  //     progress.on('abort', () => {
  //         abort = true
  //     })
  // } else {
  //     progress = null
  // }
  // let percent = 10
  // updateProgress();
  var logout_res_msg = '';
  var isLoggedOut = false;
  /* **************** Puppeteer Code Start **************** */
  glob.browserG[user_id].newPage().then(async page => {
    const log_out_URL =
      'https://hiring.monster.com/logout.aspx?intcid=HEADER_logout';
    await page.addScriptTag({
      url: 'https://code.jquery.com/jquery-3.4.1.min.js'
    });
    await page.setUserAgent(
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/44.0.2403.157 Safari/537.36'
    );
    var cookiesFilePath =
      monsterCookiesFilePath + 'monster_' + user_id + '.json';
    var previousSession = jsonfile.readFileSync(cookiesFilePath);
    if (previousSession == '') {
      previousSession = '[]';
    }
    const cookiesArr = JSON.parse(previousSession);
    if (cookiesArr.length !== 0) {
      for (let cookie of cookiesArr) {
        await page.setCookie(cookie);
      }
    }

    await page.goto(log_out_URL, {waitUntil: 'networkidle2'});
    //progress.emit('message', "Trying To logout in Monster ");
    rPub.publish(progress, {
      event: 'message',
      value: 'Trying To logout in Monster'
    });
    await page.waitFor(2000);
    try {
      const loggedElementsCounts = await page.evaluate(() => {
        const element = document.querySelectorAll('#settingsDetailsMenu');
        return element.length;
      });
      if (loggedElementsCounts == 0) {
        isLoggedOut = true;
        logout_res_msg = 'Successfully Logout';
        glob.browserG[user_id].close();
        //progress.emit('message', logout_res_msg);
        //progress.emit('done');
        rPub.publish(progress, {event: 'message', value: logout_res_msg});
        rPub.publish(progress, {event: 'done', value: ''});
        model
          .updateMonsterUserStatus(user_id, 'free')
          .then(result => {})
          .catch(err => {
            reject(responseHelper.generateErrorResponse(err));
          });
      } else {
        isLoggedOut = false;
        const loggedFailElementsCounts = await page.evaluate(() => {
          const element = document.querySelectorAll(
            '#ctl00_ctl00_ContentPlaceHolderBase_cphBody_ValidationSummary1'
          );
          return element.length;
        });
        if (loggedFailElementsCounts > 0) {
          logout_res_msg = await page.evaluate(() => {
            const element = document.querySelectorAll(
              '#ctl00_ctl00_ContentPlaceHolderBase_cphBody_ValidationSummary1'
            );
            return element[0].innerText;
          });
          //progress.emit('message', logout_res_msg);
          //progress.emit('done');
          rPub.publish(progress, {event: 'message', value: logout_res_msg});
          rPub.publish(progress, {event: 'done', value: ''});
        }
      }
    } catch (err) {
      isLoggedOut = false;
      const loggedFailElementsCounts = await page.evaluate(() => {
        const element = document.querySelectorAll(
          '#ctl00_ctl00_ContentPlaceHolderBase_cphBody_ValidationSummary1'
        );
        return element.length;
      });
      if (loggedFailElementsCounts > 0) {
        logout_res_msg = await page.evaluate(() => {
          const element = document.querySelectorAll(
            '#ctl00_ctl00_ContentPlaceHolderBase_cphBody_ValidationSummary1'
          );
          return element[0].innerText;
        });
        //progress.emit('message', logout_res_msg);
        //progress.emit('done');
        rPub.publish(progress, {event: 'message', value: logout_res_msg});
        rPub.publish(progress, {event: 'done', value: ''});
      }
      //progress.emit('done');
      rPub.publish(progress, {event: 'done', value: ''});
    }
  });
};

/*search candidate Service*/
Service.prototype.updateSearchDataProgress = function(progress, req) {
  console.log('Progress inside updateSearchDataProgress');

  var drop_year_val = '';
  var job_du_val = '';
  var wil_val = '';
  var _this = this;
  candidate_Inserted_count = 0;
  candidate_saved_count = 1;
  candidate_total_count = 1;
  var logged_user_id = req.body.logged_user_id;
  console.log(
    'Progress , Does Browser exist ' +
      Object.keys(glob.browserG).length +
      ':' +
      glob.browserG.hasOwnProperty(logged_user_id)
  );
  console.log('Progress rPub : Trying to get candidate Result');
  rPub.publish(progress, {
    event: 'message',
    value: 'Trying to get candidate Result'
  });
  /*search Candidate create or not*/
  (async () => {
    console.log('Progress : Check 1 ');
    var employee_user_id = req.body.employee_user_id;
    var camapign_name = req.body.campaign;
    var user_id = logged_user_id;
    var campaign_id = '';
    var cookiesFilePath =
      monsterCookiesFilePath + 'monster_' + user_id + '.json';
    var searching_limit = req.body.download_limit;
    /*check campaign name*/
    console.log('Progress : Check 2 ');

    model
      .getCampaignByCamapignName(camapign_name, employee_user_id)
      .then(campaign_result => {
        //progress.emit('message', "Your Searching Limit is " + searching_limit);
        console.log(
          'Progress rPub : Your Searching Limit is ' + searching_limit
        );
        rPub.publish(progress, {
          event: 'message',
          value: 'Your Searching Limit is ' + searching_limit
        });
        (async () => {
          console.log('Progress : Check 3 ' + campaign_result.length);
          if (campaign_result.length > 0) {
            campaign_id = campaign_result[0]['campaign_id'];
            //progress.emit('message', "Campaign Id already Added");
            console.log('Progress : Campaign Id already Added');
            rPub.publish(progress, {
              event: 'message',
              value: 'Campaign Id already Added'
            });
          } else {
            /* Add new campaign */
            console.log('Progress , New Campaign ');
            const current_date = new Date();
            const current_date_format =
              current_date.getFullYear() +
              '-' +
              (current_date.getMonth() + 1) +
              '-' +
              ('0' + current_date.getDate()).slice(-2) +
              ' ' +
              current_date.getHours() +
              ':' +
              current_date.getMinutes() +
              ':' +
              current_date.getSeconds();
            var campaign_status = 'draft';
            var search_json = req.body;
            search_json = JSON.stringify(search_json);

            model
              .saveCampaign(
                camapign_name,
                user_id,
                employee_user_id,
                campaign_status,
                search_json,
                current_date_format
              )
              .then(campaign_result => {
                campaign_id = campaign_result.insertId;
                //progress.emit('message', "Campaign Id new Added");
                rPub.publish(progress, {
                  event: 'message',
                  value: 'Campaign Id new Added'
                });
              })
              .catch(err => {
                //reject(responseHelper.generateErrorResponse(err));
                rPub.publish(progress, {
                  event: 'message',
                  value: 'Campaign Added Failed - ' + err
                });
              });
          }
          console.log('Progress , user_id>>>>>', user_id);
          //  _this.mainPuppetter(user_id, function(browser) {
          if (!glob.browserG.hasOwnProperty(user_id)) {
            console.log(
              'No browser found for ' +
                user_id +
                ' internal issue , quitting - ' +
                glob.browserG
            );
            rPub.publish(progress, {
              event: 'error',
              value:
                'No browser found for ' +
                user_id +
                ' internal issue , quitting - ' +
                Object.keys(glob.browserG).length +
                ':' +
                Object.keys(glob.browserG)
            });
          }
          glob.browserG[user_id]
            .newPage()
            .then(async page => {
              try {
                const URL =
                  'https://hiring.monster.com/jcm/resumesearch/resumesearch.aspx?force=false';
                await page.setUserAgent(
                  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/44.0.2403.157 Safari/537.36'
                );
                await page.goto(URL, {waitUntil: 'networkidle2'});
                await page.addScriptTag({
                  url: 'https://code.jquery.com/jquery-3.4.1.min.js'
                });
                await page.waitFor(4000);
                if (page.url().indexOf('Challenge.aspx') != -1) {
                  await page.waitForSelector('#questionPad', {timeout: 6000});
                  //progress.emit('captcha_message', "Captcha Recieved");
                  rPub.publish(progress, {
                    event: 'captcha_message',
                    value: 'Captcha Recieved'
                  });
                  (async () => {
                    const captchaQuetion = await page.evaluate(() => {
                      const element = $('#questionPad');
                      return element.length;
                    });

                    if (captchaQuetion > 0) {
                      //progress.emit('captcha_message', "Captcha quetion Recieved");
                      rPub.publish(progress, {
                        event: 'captcha_message',
                        value: 'Captcha quetion Recieved'
                      });
                      const captchaQuetionText = await page.evaluate(() => {
                        const quetionText = $(
                          '#ctl00_ctl00_ContentPlaceHolderBase_ContentPlaceHolder1_ctl00_lblQuestion'
                        ).text();
                        return quetionText;
                      });
                      //progress.emit('captcha_Quetion_message', captchaQuetionText);
                      rPub.publish(progress, {
                        event: 'captcha_Quetion_message',
                        value: captchaQuetionText
                      });
                    }
                  })();
                  //progress.emit('captcha_message', "Captcha Recieved");
                  rPub.publish(progress, {
                    event: 'captcha_message',
                    value: 'Captcha Recieved'
                  });
                  return false;
                }
                await page.click('a[title = "Show Advanced Search Options"]');
                /*title Add*/
                if (typeof req.body.job_title != 'undefined') {
                  var selected_job_title_arr = req.body.job_title || [];
                  if (selected_job_title_arr.length > 1) {
                    const forLoop = async _ => {
                      for (
                        var jt = 0;
                        jt < selected_job_title_arr.length;
                        jt++
                      ) {
                        if (selected_job_title_arr.length - 1 > jt) {
                          await page.click(
                            '#facetJobTitle2_edit a.add-button'
                          );
                        }
                        const jobTitleInputElement = await page.$$(
                          '[title="Job Title"]'
                        );
                        await jobTitleInputElement[jt].type(
                          selected_job_title_arr[jt]['value']
                        );
                      }
                    };
                    forLoop();
                  } else {
                    await page.type(
                      'input[title="Job Title"]',
                      req.body.job_title[0]['value']
                    );
                    //progress.emit('message', "Fill value of jobTitle");
                    rPub.publish(progress, {
                      event: 'message',
                      value: 'Fill value of jobTitle'
                    });
                  }
                }
                /*experience Add*/
                if (req.body.experience) {
                  await page.type(
                    'input[title="Years of Experience"]',
                    req.body.experience
                  );
                  //progress.emit('message', "Fill value of Experience");
                  rPub.publish(progress, {
                    event: 'message',
                    value: 'Fill value of Experience'
                  });
                }
                if (req.body.experienceToogle == true) {
                  await page.click(
                    '#ctl00_ctl00_ContentPlaceHolderBase_cphBody_tblr_facetYears2_input0_importance a'
                  );
                  //progress.emit('message', "click value of required Experience ");
                  rPub.publish(progress, {
                    event: 'message',
                    value: 'click value of required Experience'
                  });
                }

                /*location Add*/
                await page.waitFor(1000);
                if (typeof req.body.location != 'undefined') {
                  var selected_location_arr = req.body.location || [];
                  if (selected_location_arr.length > 1) {
                    const forLoop_location = async _ => {
                      for (
                        var jt = 0;
                        jt < selected_location_arr.length;
                        jt++
                      ) {
                        if (selected_location_arr.length - 1 > jt) {
                          await page.click(
                            '#facetLocation2_edit a.add-button'
                          );
                        }
                        const locationElement = await page.$$(
                          '[title="Location"]'
                        );
                        await locationElement[jt].type(
                          selected_location_arr[jt]['value']
                        );
                        //progress.emit('message', "Fill value of Location");
                        rPub.publish(progress, {
                          event: 'message',
                          value: 'Fill value of Location'
                        });
                      }
                    };
                    forLoop_location();
                  } else {
                    await page.type(
                      'input[title="Location"]',
                      req.body.location[0]['value']
                    );
                    //progress.emit('message', "Fill value of Location");
                    rPub.publish(progress, {
                      event: 'message',
                      value: 'Fill value of Location'
                    });
                  }
                }
                await page.waitFor(1000);

                /*Skills Add*/
                if (typeof req.body.skills_val != 'undefined') {
                  var selected_skill_arr = req.body.skills_val || [];
                  if (selected_skill_arr.length > 0) {
                    const forLoop_skil = async _ => {
                      for (var jt = 0; jt < selected_skill_arr.length; jt++) {
                        if (selected_skill_arr.length - 3 > jt) {
                          await page.click('#facetSkills2_edit a.add-button');
                        }
                        const skillElement = await page.$$(
                          '[title="Skills or Keywords"]'
                        );
                        await skillElement[jt].type(
                          selected_skill_arr[jt]['value']
                        );
                        if (selected_skill_arr[jt]['isrequird'] == true) {
                          const $skill_switch = await page.$$(
                            '#facetSkills2_edit .importance-selector'
                          );
                          await $skill_switch[jt].click();
                          //progress.emit('message', "click value of required ");
                          rPub.publish(progress, {
                            event: 'message',
                            value: 'Click value of required'
                          });
                        }
                        //progress.emit('message', "Fill value of Skills");
                        rPub.publish(progress, {
                          event: 'message',
                          value: 'Fill value of Skills'
                        });
                      }
                    };
                    forLoop_skil();
                  }
                }
                await page.waitFor(1000);
                /*resume_update Add*/
                var resume_update = '';
                const select_arr = {
                  Today: '1440',
                  'within 1 day': '2880',
                  'within 2 days': '4320',
                  'within 3 days': '5760',
                  'within 1 week': '10080',
                  'within 1 month': '43200',
                  'within 3 months': '129600',
                  'within 6 months': '259200',
                  'within 9 months': '388800',
                  'within 12 months': '525600'
                };
                if (
                  typeof select_arr[req.body.resume_update] != 'undefined'
                ) {
                  resume_update = select_arr[req.body.resume_update];
                }
                if (resume_update) {
                  await page.select(
                    '#ctl00_ctl00_ContentPlaceHolderBase_cphBody_ddl_facetResumesUpdated2',
                    resume_update
                  );
                  //progress.emit('message', "Fill value of Resume Updated");
                  rPub.publish(progress, {
                    event: 'message',
                    value: 'Fill value of Resume Updated'
                  });
                }

                /*maximum_sal and dropdown Add*/
                if (
                  typeof req.body.hour_year != 'undefined' &&
                  req.body.hour_year != ''
                ) {
                  await page.click(
                    `input[title="${req.body.hour_year}"]`,
                    req.body.hour_year
                  );
                  //progress.emit('message', "Fill value of Per Year OR Hour");
                  rPub.publish(progress, {
                    event: 'message',
                    value: 'Fill value of Per Year OR Hour'
                  });
                }
                const year_drop_val = {
                  '$30,000': '1',
                  '$40,000': '2',
                  '$50,000': '3',
                  '$60,000': '4',
                  '$70,000': '5',
                  '$80,000': '6',
                  '$90,000': '7',
                  '$100,000': '8',
                  '$125,000': '9',
                  '$150,000': '10,',
                  $10: '101',
                  $15: '102',
                  $20: '103',
                  $25: '104',
                  $50: '105',
                  $70: '106',
                  $100: '107',
                  '120': '108',
                  '150': '109',
                  $200: '110,'
                };
                if (
                  typeof year_drop_val[req.body.year_drop_val] !=
                    'undefined' &&
                  req.body.year_drop_val != ''
                ) {
                  drop_year_val = year_drop_val[req.body.year_drop_val];
                }
                if (req.body.hour_year == 'Per Hour') {
                  await page.select(
                    '#ctl00_ctl00_ContentPlaceHolderBase_cphBody_ddlMaxSalaryHourly',
                    drop_year_val
                  );
                  //progress.emit('message', "Fill value of year or hour value");
                  rPub.publish(progress, {
                    event: 'message',
                    value: 'Fill value of year or hour value'
                  });
                } else {
                  await page.select(
                    '#ctl00_ctl00_ContentPlaceHolderBase_cphBody_ddlMaxSalaryYearly',
                    drop_year_val
                  );
                  //progress.emit('message', "Fill value of year or hour value");
                  rPub.publish(progress, {
                    event: 'message',
                    value: 'Fill value of year or hour value'
                  });
                }

                /*jobType Add*/

                if (typeof req.body.jobtype_val != 'undefined') {
                  var selected_job_types_arr = req.body.jobtype_val || [];
                  for (var jt = 0; jt < selected_job_types_arr.length; jt++) {
                    if (selected_job_types_arr[jt] != '') {
                      await page.click(
                        `input[title="${selected_job_types_arr[jt]}"]`,
                        req.body.jobtype_val
                      );
                      //progress.emit('message', "Fill value of Job type");
                      rPub.publish(progress, {
                        event: 'message',
                        value: 'Fill value of Job type'
                      });
                    }
                  }
                }
                /* jobduration Add */
                const sal_arr = {
                  '1 year': '1',
                  '2 years': '2',
                  '5 years': '5',
                  '10 years': '10'
                };
                if (typeof sal_arr[req.body.job_du_val] != 'undefined') {
                  job_du_val = sal_arr[req.body.job_du_val];
                  await page.select(
                    '#ctl00_ctl00_ContentPlaceHolderBase_cphBody_ddl_facetJobTenure2',
                    job_du_val
                  );
                  //progress.emit('message', "Fill value of Job Duration");
                  rPub.publish(progress, {
                    event: 'message',
                    value: 'Fill value of Job Duration'
                  });
                }
                await Promise.all([
                  await page.click(
                    '#ctl00_ctl00_ContentPlaceHolderBase_cphBody_SearchBtnTop'
                  ),
                  await page.waitForNavigation(PAGE_WAIT_UNTIL_0)

                  // page.waitForNavigation({ waitUntil: 'networkidle2' }),
                  //await page.addScriptTag({ url: 'https://code.jquery.com/jquery-3.4.1.min.js' })
                ]);
                //progress.emit('message', "Submit Form");
                rPub.publish(progress, {
                  event: 'message',
                  value: 'Submit Form'
                });
                _this.saveCandidateFromCurrentPage(
                  page,
                  progress,
                  req,
                  cookiesFilePath,
                  campaign_id,
                  candidate_saved_count
                );
              } catch (err) {
                //progress.emit('message', "Unexpected Error - " + err);
                //progress.emit('done');
                rPub.publish(progress, {
                  event: 'message',
                  value: 'Unexpected Error - ' + err
                });
                rPub.publish(progress, {event: 'done', value: ''});
              }
            })
            .catch(err => {
              console.log('Progress , error', err);
            });
          //}
        })();
      })
      .catch(err => {
        reject(responseHelper.generateErrorResponse(err));
      });
  })();
};
// ,candidate_saved_count,cookiesFilePath,progress,searching_limit,limit_reached,campaign_id,user_id,employee_user_id,company_name,job_title,years_exp,page
Service.prototype.checkCandidateTojobdiva = function(
  first_name_candidate_domval,
  last_name_candidate_domval,
  total_all_candidate,
  location,
  candidateListArr,
  CompanyName_dom_val,
  Yearsexp_dom_val,
  JobTitle_dom_val,
  candidate_saved_count,
  searching_limit,
  cookiesFilePath,
  campaign_id,
  progress,
  user_id,
  employee_user_id,
  limit_reached
) {
  var resume_value = '';
  var recentCompany = '';
  var recentjobTitle = '';
  var totalyrsexp = '';
  var _this = this;
  var CandidateName = '';
  var candidateFullName = '';
  var candidateFirstName = '';
  var candidateLastName = '';
  var body = {
    location: location,
    //email:"pandu.sanapala1@gmail.com",
    first_name: first_name_candidate_domval,
    last_name: last_name_candidate_domval
  };

  (async () => {
    var jdResponse = await pipl_service.searchFromJobDiva(body);
    if (jdResponse.message == 'Profile Found') {
      console.log('profile found');
      //progress.emit('message', "Profile already in JobDiva");
      // console.log("Person>>>", jdResponse.data.persons);
    } else {
      var candidateDetailsArr = [];
      var userDetailsPromiseArr = [];
      var candidate_list_result = candidateListArr;

      for (var i12 = 0; i12 < 2; i12++) {
        //for (var i12 = 0; i12 < candidate_list_result.length; i12++) {
        CandidateName = candidate_list_result[i12]['CandidateName'];
        candidateFullName = CandidateName.split('u0026nbsp;');
        candidateFirstName = candidateFullName[0];
        candidateLastName = candidateFullName[1];
        resume_value = candidate_list_result[i12]['ResumeValue'];
        totalyrsexp = candidate_list_result[i12]['TotalYearsExperience'];
        recentCompany = candidate_list_result[i12]['RecentCompanyName'];
        recentjobTitle = candidate_list_result[i12]['RecentJobTitle'];
        var JobTitle_dom_value = JobTitle_dom_val.split(',')[0];
        if (
          recentCompany == CompanyName_dom_val &&
          recentjobTitle == JobTitle_dom_value &&
          totalyrsexp == Yearsexp_dom_val
        ) {
          if (resume_value != null && typeof resume_value != 'null') {
            if (searching_limit >= candidate_saved_count) {
              candidate_saved_count++;
              userDetailsPromiseArr.push(
                new Promise(function(resolve, reject) {
                  return new Promise((resolve, reject) => {
                    var detail_uri =
                      'https://hiring.monster.com/jcm/singleResumeView.aspx?rd={"ResumeValue"%3A"' +
                      resume_value +
                      '"%2C"Relevance"%3A2.3%2C"IsBlocked"%3Afalse%2C"ESC_Disability"%3Afalse%2C"ShowVeteranIcon"%3Afalse%2C"ShowHandicappedIcon"%3Afalse%2C"IsMostRecentExperienceAContextMatch"%3Afalse}&ps=false&type=PRS&seng=trovix&co=US&jt=javascript&yex=1&mdatemaxage=1440&rb=1%2c6143&esl=TD&tsni=1&TD=1&lchid=58&pagesize=20&page=1&stype=0';
                    const previousSession = jsonfile.readFileSync(
                      cookiesFilePath
                    );
                    const cookiesArr = JSON.parse(previousSession);
                    const pageCookies = cookiesArr;
                    const cookieObjects = pageCookies.reduce(
                      (acc, cookie) => {
                        acc[cookie.name] = cookie.value;
                        return acc;
                      },
                      {}
                    );
                    const cookieString = querystring.stringify(
                      cookieObjects,
                      '; '
                    );
                    let options = {
                      method: 'GET',
                      uri: detail_uri,
                      headers: {
                        Cookie: `${cookieString};`
                      }
                    };
                    (function(resume_value, location) {
                      request(options)
                        .then(function(candidate_response) {
                          const $ = cheerio.load(candidate_response);
                          var cell_phone = $(
                            '#ctl00_ctl00_ContentPlaceHolderBase_ContentPlaceHolder1_ctl00_controlDetailTop_lbMobile'
                          )
                            .text()
                            .trim();
                          var email = $(
                            '#ctl00_ctl00_ContentPlaceHolderBase_ContentPlaceHolder1_ctl00_controlDetailTop_linkEmail'
                          )
                            .text()
                            .trim();
                          var fullName = $(
                            '#ctl00_ctl00_ContentPlaceHolderBase_ContentPlaceHolder1_ctl00_controlDetailTop_lbName'
                          )
                            .text()
                            .trim();
                          var city = $(
                            '#ctl00_ctl00_ContentPlaceHolderBase_ContentPlaceHolder1_ctl00_controlDetailTop_lbAddress'
                          )
                            .text()
                            .trim()
                            .split(' ')[0]
                            .trim()
                            .split(',')[0]
                            .trim();
                          var state = $(
                            '#ctl00_ctl00_ContentPlaceHolderBase_ContentPlaceHolder1_ctl00_controlDetailTop_lbAddress'
                          )
                            .text()
                            .trim()
                            .split(' ')[1]
                            .trim();
                          var zip_code = $(
                            '#ctl00_ctl00_ContentPlaceHolderBase_ContentPlaceHolder1_ctl00_controlDetailTop_lbAddress'
                          )
                            .text()
                            .trim()
                            .split(' ')[2]
                            .trim();
                          var country = $(
                            '#ctl00_ctl00_ContentPlaceHolderBase_ContentPlaceHolder1_ctl00_controlDetailTop_lbAddress'
                          )
                            .text()
                            .trim()
                            .split(' ')[3]
                            .trim();
                          var ResumeLink = $(
                            '#ctl00_ctl00_ContentPlaceHolderBase_ContentPlaceHolder1_ctl00_candidateDetailTabStrip1_ctlResumeTab_hlDownload'
                          ).prop('href');
                          if (fullName && fullName.indexOf(' ') != -1) {
                            var first_name = fullName.split(' ')[0];
                            var last_name = fullName.split(' ')[1];
                          } else {
                            var first_name = fullName.split(' ')[0];
                            var last_name = '';
                          }
                          resolve({
                            cell_phone,
                            email,
                            first_name,
                            last_name,
                            resume_value,
                            city,
                            state,
                            country,
                            zip_code,
                            ResumeLink
                          });
                        })
                        .catch(function(err) {
                          resolve({});
                        });
                    })(resume_value, location);
                  }).then(candidateViewObj => {
                    //progress.emit('message', "Candidate Saved " + candidateViewObj['first_name'] + ' ' + candidateViewObj['last_name']);
                    //progress.emit('message', "Candidate Saved count " + candidate_total_count);
                    rPub.publish(progress, {
                      event: 'message',
                      value:
                        'Candidate Saved ' +
                        candidateViewObj['first_name'] +
                        ' ' +
                        candidateViewObj['last_name']
                    });
                    rPub.publish(progress, {
                      event: 'message',
                      value: 'Candidate Saved count ' + candidate_total_count
                    });
                    candidate_total_count++;
                    resolve(candidateViewObj);
                  });
                })
              );
              limit_reached = false;
            } else {
              limit_reached = true;
            }
          }
        } else {
        }
      }
    }
  })();
};

Service.prototype.saveCandidateFromCurrentPage = function(
  page,
  progress,
  req,
  cookiesFilePath,
  campaign_id,
  candidate_saved_count
) {
  var limit_reached = false;
  var searching_limit = req.body.download_limit;
  var logged_user_id = req.body.logged_user_id;
  var employee_user_id = req.body.employee_user_id;
  var camapign_name = req.body.campaign;
  var user_id = logged_user_id;
  var _this = this;
  try {
    /* Click search page get result */
    (async () => {
      if (
        page.url().indexOf('https://hiring.monster.com/fraud/captcha.aspx') !=
        -1
      ) {
        //progress.emit('captcha_message', "Captcha Recieved");
        rPub.publish(progress, {
          event: 'captcha_message',
          value: 'Captcha Recieved'
        });
        try {
          (async () => {
            const captchaImg = await page.evaluate(() => {
              const element = $(
                '#ctl00_ctl00_ContentPlaceHolderBase_ContentPlaceHolder1_ctlCaptcha_imgCaptcha'
              );
              return element.length;
            });
            if (captchaImg > 0) {
              //progress.emit('captcha_message', "Captcha img Recieved");
              rPub.publish(progress, {
                event: 'captcha_message',
                value: 'Captcha img Recieved'
              });
              const captchaImgText = await page.evaluate(() => {
                const quetionText = $(
                  '#ctl00_ctl00_ContentPlaceHolderBase_ContentPlaceHolder1_ctlCaptcha_imgCaptcha'
                ).prop('src');
                return quetionText;
              });
              //progress.emit('captcha_img_message', captchaImgText);
              rPub.publish(progress, {
                event: 'captcha_img_message',
                value: captchaImgText
              });
            }
          })();
        } catch (err) {
          //progress.emit('captcha_message', "Captcha Recieved");
          //progress.emit('done');
          rPub.publish(progress, {
            event: 'captcha_message',
            value: 'Captcha Recieved'
          });
          rPub.publish(progress, {event: 'done', value: ''});
        }

        return false;
      }

      const candidate_list_result1 = await page.evaluate(progress => {
        try {
          var candidateListArr = [];
          var total_all_candidate = 0;
          var total_count_str = 0;
          var first_name_candidate = '';
          var last_name_candidate = '';
          var current_pageNumber = $(
            '#ctl00_ctl00_ContentPlaceHolderBase_ContentPlaceHolderRight_CndTop_pagingHeader_currPage'
          ).val();
          var total_all_candidate = $(
            '#ctl00_ctl00_ContentPlaceHolderBase_ContentPlaceHolderRight_CndTop_lblRecordPortion'
          )
            .text()
            .split('of')[1]
            .split('Candidates')[0]
            .trim();
          var fullName_candidate = $('.candidateNameTitle')
            .text()
            .trim();
          var location_dom = $('.candidateLocation:eq(0)')
            .text()
            .trim();
          var CompanyName_dom = $('.currentCompany:eq:eq(0)')
            .text()
            .trim();
          var Yearsexp_dom = $('.yearsMsg:eq(0)')
            .text()
            .trim();
          var JobTitle_dom = $('.currentJobTitle:eq(0)')
            .text()
            .trim();
          var first_name_candidate_dom = fullName_candidate.split(/\s/)[0];
          last_name_candidate_dom = fullName_candidate.split(/\s/)[1];

          var search_resumes_arr = [];
          var search_resumes_str = '';
          var body_str = $('html').html();
          if (body_str.indexOf('"_resumes":') != -1) {
            body_str = body_str.split('"_resumes":"')[1];
            body_str = body_str.replace(/\\/g, '');
            if (body_str.indexOf('}]"') != -1) {
              search_resumes_str = body_str.split('}]"')[0] + '}]';
            }
          }
          if (search_resumes_str) {
            search_resumes_arr = JSON.parse(search_resumes_str);
            candidateListArr = search_resumes_arr;
          }
          return {
            candidateListArr,
            total_all_candidate,
            total_count_str,
            current_pageNumber,
            first_name_candidate_dom,
            last_name_candidate_dom,
            location_dom,
            CompanyName_dom,
            Yearsexp_dom,
            JobTitle_dom
          };
        } catch (err) {
          return {
            candidateListArr,
            total_all_candidate,
            total_count_str,
            current_pageNumber,
            first_name_candidate_dom,
            last_name_candidate_dom,
            location_dom,
            CompanyName_dom,
            Yearsexp_dom,
            JobTitle_dom
          };
        }
      });
      //progress.emit("message", "campaign_id is: " + campaign_id);
      //progress.emit('message', "Total Candidate Found " + candidate_list_result1.total_all_candidate);
      //progress.emit('message', "Current Page " + candidate_list_result1.current_pageNumber);
      rPub.publish(progress, {
        event: 'message',
        value: 'campaign_id is: ' + campaign_id
      });
      rPub.publish(progress, {
        event: 'message',
        value:
          'Total Candidate Found ' +
          candidate_list_result1.total_all_candidate
      });
      rPub.publish(progress, {
        event: 'message',
        value: 'Current Page ' + candidate_list_result1.current_pageNumber
      });
      var total_all_str = candidate_list_result1.total_count_str;
      var candidate_list_result = candidate_list_result1.candidateListArr;
      var first_name_candidate_domval =
        candidate_list_result1.first_name_candidate_dom;
      var last_name_candidate_domval =
        candidate_list_result1.last_name_candidate_dom;
      var total_candalllist = candidate_list_result1.total_all_candidate;
      var location_val = candidate_list_result1.location_dom;
      var CompanyName_dom_val = candidate_list_result1.CompanyName_dom;
      var Yearsexp_dom_val = candidate_list_result1.Yearsexp_dom;
      var JobTitle_dom_val = candidate_list_result1.JobTitle_dom;

      // _this.checkCandidateTojobdiva(first_name_candidate_domval,last_name_candidate_domval,total_candalllist,location_val,candidate_list_result,CompanyName_dom_val,Yearsexp_dom_val,JobTitle_dom_val,candidate_saved_count,searching_limit,cookiesFilePath,campaign_id,progress,user_id,employee_user_id,limit_reached);
      // return;
      var candidateFirstName = '';
      var candidateLastName = '';
      var candidateBody = {};
      var candidateDetailsArr = [];
      var userDetailsPromiseArr = [];
      var candidate_list_result = candidate_list_result1.candidateListArr;
      var JDdetails;
      var candidateLocation = '';
      var candidateCity = '';
      var candidateState = '';
      // var candidateDetailsArr = [];
      // var userDetailsPromiseArr = [];
      // var candidate_list_result=candidate_list_result1.candidateListArr;
      //for (var i12 = 0; i12 < 2; i12++) {
      for (var i12 = 0; i12 < candidate_list_result.length; i12++) {
        if (
          candidate_list_result[i12]['ResumeValue'] != null &&
          typeof candidate_list_result[i12]['ResumeValue'] != 'null'
        ) {
          var ResumeValue = candidate_list_result[i12]['ResumeValue'];
          if (searching_limit >= candidate_saved_count) {
            CandidateName = candidate_list_result[i12]['CandidateName'];
            candidateFullName = CandidateName.split('u0026nbsp;');
            candidateFirstName = candidateFullName[0];
            candidateLastName = candidateFullName[1];
            candidateLocation = candidate_list_result[i12]['Location'].split(
              ' '
            );
            candidateCity = candidateLocation[0];
            candidateState = candidateLocation[1];
            candidateBody = {
              first_name: candidateFirstName,
              last_name: candidateLastName,
              city: candidateCity,
              state: candidateState
            };
            //progress.emit("message", "Checking candidate " + candidateFirstName + " " + candidateLastName + " in JobDiva:");
            rPub.publish(progress, {
              event: 'message',
              value:
                'Checking candidate ' +
                candidateFirstName +
                ' ' +
                candidateLastName +
                ' in JobDiva:'
            });
            JDdetails = await pipl_service.searchFromJobDiva(candidateBody);
            await _this._sleep(2000);
            if (JDdetails.message == 'Profile Found') {
              //progress.emit("message", "Profile Found for candidate: " + candidateFirstName + " " + candidateLastName + " in JobDiva");
              rPub.publish(progress, {
                event: 'message',
                value:
                  'Profile Found for candidate: ' +
                  candidateFirstName +
                  ' ' +
                  candidateLastName +
                  ' in JobDiva'
              });
            } else {
              //progress.emit("message", "Profile Not Found for candidate: " + candidateFirstName + " " + candidateLastName + " in JobDiva");
              rPub.publish(progress, {
                event: 'message',
                value:
                  'Profile Not Found for candidate: ' +
                  candidateFirstName +
                  ' ' +
                  candidateLastName +
                  ' in JobDiva'
              });
              candidate_saved_count++;
              userDetailsPromiseArr.push(
                new Promise(function(resolve, reject) {
                  return new Promise((resolve, reject) => {
                    // progress.emit("message", "Went here 1");
                    var detail_uri =
                      'https://hiring.monster.com/jcm/singleResumeView.aspx?rd={"ResumeValue"%3A"' +
                      ResumeValue +
                      '"%2C"Relevance"%3A2.3%2C"IsBlocked"%3Afalse%2C"ESC_Disability"%3Afalse%2C"ShowVeteranIcon"%3Afalse%2C"ShowHandicappedIcon"%3Afalse%2C"IsMostRecentExperienceAContextMatch"%3Afalse}&ps=false&type=PRS&seng=trovix&co=US&jt=javascript&yex=1&mdatemaxage=1440&rb=1%2c6143&esl=TD&tsni=1&TD=1&lchid=58&pagesize=20&page=1&stype=0';
                    const previousSession = jsonfile.readFileSync(
                      cookiesFilePath
                    );
                    const cookiesArr = JSON.parse(previousSession);
                    const pageCookies = cookiesArr;
                    const cookieObjects = pageCookies.reduce(
                      (acc, cookie) => {
                        acc[cookie.name] = cookie.value;
                        return acc;
                      },
                      {}
                    );
                    const cookieString = querystring.stringify(
                      cookieObjects,
                      '; '
                    );
                    let options = {
                      method: 'GET',
                      uri: detail_uri,
                      headers: {
                        Cookie: `${cookieString};`
                      }
                    };

                    request(options)
                      .then(function(candidate_response) {
                        // progress.emit("message", "Went here 2");
                        const $ = cheerio.load(candidate_response);
                        var mobile = $(
                          '#ctl00_ctl00_ContentPlaceHolderBase_ContentPlaceHolder1_ctl00_controlDetailTop_lbMobile'
                        )
                          .text()
                          .trim();
                        var email = $(
                          '#ctl00_ctl00_ContentPlaceHolderBase_ContentPlaceHolder1_ctl00_controlDetailTop_linkEmail'
                        )
                          .text()
                          .trim();
                        var fullName = $(
                          '#ctl00_ctl00_ContentPlaceHolderBase_ContentPlaceHolder1_ctl00_controlDetailTop_lbName'
                        )
                          .text()
                          .trim();
                        var resume_url =
                          'https://hiring.monster.com/jcm/candidates/downloadSeekerDocument.aspx?sPath=private_0/resumes/' +
                          ResumeValue;

                        //await page.waitForSelector('.at-actionDownloadWordLink', {timeout: 6000});
                        /*resume_url = $('.at-actionDownloadPdfLink').attr('href');
                                                    console.log('PDF resume_url >> ',resume_url);                       */
                        //console.log($('#ctl00_ctl00_ContentPlaceHolderBase_ContentPlaceHolder1_ctl00_candidateDetailTabStrip1_ctlResumeTab_lblDownloadResume').text());
                        /*$('#ctl00_ctl00_ContentPlaceHolderBase_ContentPlaceHolder1_ctl00_candidateDetailTabStrip1_ctlResumeTab_hlDownload').each(function(index,element){
                                                      console.log(index);
                                                         resume_url = $(element).attr('href');
                                                    })
                                                    resume_url = $('.at-actionDownloadWordLink').attr('href');*/
                        console.log('WorD resume_url >> ', resume_url);

                        if (fullName && fullName.indexOf(' ') != -1) {
                          var first_name = fullName.split(' ')[0];
                          var last_name = fullName.split(' ')[1];
                        } else {
                          var first_name = fullName.split(' ')[0];
                          var last_name = '';
                        }

                        //progress.emit("message", "Storing candidate " + first_name + " " + last_name + " in JobDiva");
                        console.log('resume_url >> ', resume_url);
                        //progress.emit("message", "Candidate email: " + email);
                        rPub.publish(progress, {
                          event: 'message',
                          value:
                            'Storing candidate ' +
                            first_name +
                            ' ' +
                            last_name +
                            ' in JobDiva'
                        });
                        rPub.publish(progress, {
                          event: 'message',
                          value: 'Candidate email: ' + email
                        });
                        if (resume_url != undefined && resume_url != '') {
                          console.log('resume_url', resume_url);
                          candidateBody = {
                            first_name: first_name,
                            last_name: last_name,
                            email: email,
                            cell_phone: mobile,
                            city: candidateCity,
                            state: candidateState
                          };

                          let options = {
                            method: 'GET',
                            uri: resume_url,
                            headers: {
                              Cookie: `${cookieString};`
                            }
                          };
                          request(options).then(function(resume_response) {
                            //console.log("resume_response >> ",resume_response);
                            //var resume_base64 = _this.base64Encode(resume_response);
                            var resume_base64 = Buffer.from(
                              resume_response,
                              'binary'
                            ).toString('base64');
                            //btoa(unescape(encodeURIComponent(rawData)));
                            //var base64EncodedStr = btoa(unescape(encodeURIComponent(resume_response)));
                            //var resume_base64 = base64EncodedStr;

                            candidateBody.resume_base64 = resume_base64;
                            //console.log("candidateBody >> ", candidateBody);
                            (async () => {
                              var jdResponse_jobdiva = await _this.addNewCandidateToJobDiva(
                                candidateBody
                              );
                              // convert XML data to JSON
                              let jobDivaResponseJSON =
                                jdResponse_jobdiva.data;
                              // console.log("JDresponse: ",JSON.stringify(jobDivaResponseJSON));
                              let candidateID = 'Unavailable';
                              candidateID = _.get(
                                jobDivaResponseJSON,
                                'children[0].children[2].children[0].text',
                                null
                              );
                              // console.log("JobDiva candidateID >> ", candidateID);
                              if (
                                candidateID == 'Unavailable' ||
                                candidateID == null
                              ) {
                                candidateID = 'Unavailable';
                                //progress.emit("message", "JobDiva too many API requests!");
                                rPub.publish(progress, {
                                  event: 'message',
                                  value: 'JobDiva too many API requests!'
                                });
                              }
                              resolve({
                                mobile,
                                email,
                                first_name,
                                last_name,
                                ResumeValue,
                                candidateID
                              });
                            })();
                          });
                        }
                      })
                      .catch(function(err) {
                        resolve({});
                      });
                    //})();
                  }).then(candidateViewObj => {
                    console.log('Cand view Obj: ');
                    console.log(candidateViewObj);
                    //progress.emit('message', "Candidate Saved " + candidateViewObj['first_name'] + ' ' + candidateViewObj['last_name']);
                    //progress.emit('message', "Candidate Saved count " + candidate_total_count);
                    rPub.publish(progress, {
                      event: 'message',
                      value:
                        'Candidate Saved ' +
                        candidateViewObj['first_name'] +
                        ' ' +
                        candidateViewObj['last_name']
                    });
                    rPub.publish(progress, {
                      event: 'message',
                      value: 'Candidate Saved count ' + candidate_total_count
                    });
                    candidate_total_count++;
                    resolve(candidateViewObj);
                  });
                })
              );
            }
            limit_reached = false;
          } else {
            limit_reached = true;
            //resolve({});
          }
        }
      }

      Promise.all(userDetailsPromiseArr).then(searchResArray => {
        //progress.emit('message', "Get total candidate Details");
        rPub.publish(progress, {
          event: 'message',
          value: 'Get total candidate Details'
        });
        searchResArray = searchResArray.filter(
          it => it.first_name != '',
          it => it.last_name != ''
        );
        var savedCandidateCount = 0;
        var saveCandidatePromiseArr = [];
        for (var i3 = 0; i3 < searchResArray.length; i3++) {
          /* insert candidate result into tbl_monster_candidate_result */
          const current_date = new Date();
          const current_date_format =
            current_date.getFullYear() +
            '-' +
            (current_date.getMonth() + 1) +
            '-' +
            ('0' + current_date.getDate()).slice(-2) +
            ' ' +
            current_date.getHours() +
            ':' +
            current_date.getMinutes() +
            ':' +
            current_date.getSeconds();
          saveCandidatePromiseArr.push(
            new Promise(function(resolve, reject) {
              var candidate_obj = searchResArray[i3];
              var candidate_id = candidate_obj['ResumeValue'];
              model
                .checkDuplicateCandidate(candidate_id, campaign_id)
                .then(candidate_exist_result => {
                  if (candidate_exist_result.length == 0) {
                    console.log('Candidate Object: ', candidate_obj);
                    model
                      .saveCandidates(
                        candidate_id,
                        campaign_id,
                        user_id,
                        employee_user_id,
                        candidate_obj,
                        current_date_format
                      )
                      .then(candidate_exist_result => {
                        console.log(
                          'Added candidate',
                          candidate_exist_result
                        );
                        savedCandidateCount++;
                        resolve();
                      })
                      .catch(err => {
                        reject(responseHelper.generateErrorResponse(err));
                      });
                  } else {
                    resolve();
                  }
                })
                .catch(err => {
                  reject(responseHelper.generateErrorResponse(err));
                });
            })
          );
          /* End insert candidate result into tbl_monster_candidate_result */
        }

        Promise.all(saveCandidatePromiseArr).then(() => {
          var Length_candidate = searchResArray.length;
          candidate_Inserted_count =
            candidate_Inserted_count + Length_candidate;
          //progress.emit('candidate_Inserted_count', candidate_Inserted_count);
          //progress.emit('message', "Details Inserted in Database");
          rPub.publish(progress, {
            event: 'candidate_Inserted_count',
            value: candidate_Inserted_count
          });
          rPub.publish(progress, {
            event: 'message',
            value: 'Details Inserted in Database'
          });
          if (limit_reached == true) {
            //progress.emit('message', "Search Limit Over");
            //progress.emit('Length', Length_candidate);
            //progress.emit('message', "All Candidate saved");
            //progress.emit('done');
            rPub.publish(progress, {
              event: 'message',
              value: 'Search Limit Over'
            });
            rPub.publish(progress, {
              event: 'Length',
              value: Length_candidate
            });
            rPub.publish(progress, {
              event: 'message',
              value: 'All Candidate saved'
            });
            rPub.publish(progress, {event: 'done', value: ''});
          } else {
            try {
              /*Check next page */
              (async () => {
                await page.waitForSelector(
                  '#ctl00_ctl00_ContentPlaceHolderBase_ContentPlaceHolderRight_CndTop_pagingHeader_lkPagerNext',
                  {timeout: 6000}
                );
                const $nextPage = await page.evaluate(() => {
                  var element = $('#pages .currPage')
                    .next()
                    .next();
                  if (element.length == 0) {
                    element = $(
                      '#ctl00_ctl00_ContentPlaceHolderBase_ContentPlaceHolderRight_CndTop_pagingHeader_lkPagerNext:visible'
                    );
                  }
                  return element.length;
                });

                if ($nextPage > 0) {
                  await Promise.all([
                    await page.evaluate(() => {
                      var $nextPageelement = $('#pages .currPage:eq(0)')
                        .next()
                        .next();
                      if ($nextPageelement.length == 0) {
                        $nextPageelement = $(
                          '#ctl00_ctl00_ContentPlaceHolderBase_ContentPlaceHolderRight_CndTop_pagingHeader_lkPagerNext:visible'
                        );
                        $nextPageelement[0].click();
                      } else {
                        $nextPageelement.find('a:eq(0)')[0].click();
                      }
                    }),
                    await page.waitForNavigation(PAGE_WAIT_UNTIL_0),

                    //await page.waitForNavigation({ waitUntil: 'networkidle2' }),
                    await page.addScriptTag({
                      url: 'https://code.jquery.com/jquery-3.4.1.min.js'
                    }),
                    await page.waitFor(2000)
                  ]);
                  _this.saveCandidateFromCurrentPage(
                    page,
                    progress,
                    req,
                    cookiesFilePath,
                    campaign_id
                  );
                } else {
                  //progress.emit('Length', Length_candidate);
                  //progress.emit('message', "All Candidate saved");
                  //progress.emit('done');
                  rPub.publish(progress, {
                    event: 'Length',
                    value: Length_candidate
                  });
                  rPub.publish(progress, {
                    event: 'message',
                    value: 'All Candidate saved'
                  });
                  rPub.publish(progress, {event: 'done', value: ''});
                }
              })();
            } catch (err) {
              //progress.emit('message', "Unexpected err " + err);
              //progress.emit('done');
              rPub.publish(progress, {
                event: 'message',
                value: 'Unexpected err ' + err
              });
              rPub.publish(progress, {event: 'done', value: ''});
            }
          }
        });
      });
    })();
  } catch (err) {
    //progress.emit('Unexpexted Err' + err);
    //progress.emit('done');
    rPub.publish(progress, {
      event: 'message',
      value: 'Unexpected err ' + err
    });
    rPub.publish(progress, {event: 'done', value: ''});
  }
};
Service.prototype.getfreeMonsterUsers = function() {
  (async () => {
    let workers = await models.monsterUsers.findAll({
      order: 'random()',
      limit: 1,
      include: [
        {
          model: models.monsterUsers,
          where: {user_status: 'free'}
        }
      ]
    });
  })();
};

Service.prototype.campaignUpdate = function(campaign_id, campaignDetails) {
  var campaignId = campaign_id;
  return new Promise(function(resolve, reject) {
    return model
      .campaignUpdate(campaignId, campaignDetails)
      .then(result => {
        resolve(responseHelper.generateResponse('Success', result || {}));
      })
      .catch(err => {
        reject(responseHelper.generateErrorResponse(err));
      });
  });
};

Service.prototype.campaignAdd = function(campaignDetails) {
  return new Promise(function(resolve, reject) {
    return model
      .campaignAdd(campaignDetails)
      .then(result => {
        resolve(responseHelper.generateResponse('Success', result || {}));
      })
      .catch(err => {
        reject(responseHelper.generateErrorResponse(err));
      });
  });
};

Service.prototype.getCampaignDetailById = function(campaign_id) {
  return new Promise(function(resolve, reject) {
    return model
      .getCampaignDetailById(campaign_id)
      .then(result => {
        // for (var i = 0; i < result.candidateData.length; i++) {
        //     if (result.candidateData[i].candidate_email.indexOf("@") != -1) {
        //         console.log("Went in here: ", result.candidateData[i].candidate_email);
        //         result.candidateData[i].candidateJD = jobDivaUtil.getCandidateByEmail(result.candidateData[i].candidate_email, "email")
        //             .then(jdData => {
        //                 console.log(jdData);
        //                 resolve(jdData.respData);
        //             }).catch(err => {
        //                 reject({});
        //             });
        //     } else {
        //         result.candidateData[i].candidateJD = {};
        //     }
        // }

        resolve(responseHelper.generateResponse('Success', result || {}));
      })
      .catch(err => {
        reject(responseHelper.generateErrorResponse(err));
      });
  });
};

Service.prototype.getCandidateResumeByEmail = function(candidate_email) {
  return new Promise(function(resolve, reject) {
    const response = jobDivaUtil.getCandidateByEmail(
      candidate_email,
      'email'
    );
    // console.log(response);
    response
      .then(jdData => {
        console.log(jdData);
        resolve(
          responseHelper.generateResponse('Success', jdData.respData || {})
        );
      })
      .catch(err => {
        console.log(err);
        reject(responseHelper.generateErrorResponse(err));
      });
  });
};

Service.prototype.getLatestResumeId = function(cand_id) {
  return new Promise(function(resolve, reject) {
    const response = jobDivaUtil.getResumesByCandidateID(cand_id);
    response
      .then(data => {
        // console.log(data);
        resolve(
          responseHelper.generateResponse('Success', data.respData || {})
        );
      })
      .catch(err => {
        console.log(err);
        reject(responseHelper.generateErrorResponse(err));
      });
  });
};

Service.prototype.getLatestResumeDetailsById = function(rsm_id) {
  return new Promise(function(resolve, reject) {
    const response = jobDivaUtil.getResumeDetailsByResumeId(rsm_id);
    response
      .then(data => {
        console.log(data);
        resolve(
          responseHelper.generateResponse('Success', data.respData || {})
        );
      })
      .catch(err => {
        console.log(err);
        reject(responseHelper.generateErrorResponse(err));
      });
  });
};

Service.prototype._sleep = function(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
};
Service.prototype.base64Encode = function(str) {
  var CHARS =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  var out = '',
    i = 0,
    len = str.length,
    c1,
    c2,
    c3;
  while (i < len) {
    c1 = str.charCodeAt(i++) & 0xff;
    if (i == len) {
      out += CHARS.charAt(c1 >> 2);
      out += CHARS.charAt((c1 & 0x3) << 4);
      out += '==';
      break;
    }
    c2 = str.charCodeAt(i++);
    if (i == len) {
      out += CHARS.charAt(c1 >> 2);
      out += CHARS.charAt(((c1 & 0x3) << 4) | ((c2 & 0xf0) >> 4));
      out += CHARS.charAt((c2 & 0xf) << 2);
      out += '=';
      break;
    }
    c3 = str.charCodeAt(i++);
    out += CHARS.charAt(c1 >> 2);
    out += CHARS.charAt(((c1 & 0x3) << 4) | ((c2 & 0xf0) >> 4));

    out += CHARS.charAt(((c2 & 0xf) << 2) | ((c3 & 0xc0) >> 6));
    out += CHARS.charAt(c3 & 0x3f);
  }
  return out;
};
Service.prototype.addNewCandidateToJobDiva = function(person) {
  return jobDivaUtil.createCandidate(person).then(function(jResponse) {
    return {
      code: jResponse['respcode'],
      message: jResponse['message'],
      data: jResponse['respData']
    };
  });
};
module.exports = {
  getInst: function() {
    return new Service();
  }
};

// Login => Fill form => Give result count -> Continue => scrape, de-duplication, get and return candidates
//           -> cancel => change form fields and search again

// puppeteerUtil

// site,data

// methods =>

// login<site-name>, eg. loginMonster
// //getCaptchaQuestion?
// checkCaptcha<site-name>
// getCandiatesCount<site-name>
// getCandidates<site-name> : first_name, last_name, city, state => check in JobDiva
// logout<site-name>, eg. loginMonster

// Progressive APIs
// Response types=>
// {"type", "message", "code", "data"}

// types :
// event => entered login, etc.
// warning=> getting captcha again, multiple attempts
// error=> timeout, inernal server error
// data => campaign id, candidate data

// event/data code: 200
// error + warning: code based on the type of warning/error

// imageCaptcha, openBrowser, openPage?
// remaining Attempts For Captcha?

// Nilay changes => ?
// Getting other details?
