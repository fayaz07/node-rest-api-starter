const Token = require("../models/token");
const crypto = require("crypto");
const send_email = require("../utils/send_email");
const mailer = new send_email();
const otpGen = require("otp-generator");

/* Send OTP for password reset 
    - check if already a token exists
    - creates a new otp
    - saves the document in db
    - send the email with new otp
    - return true
*/
module.exports.sendOTPForPasswordReset = async (userId, email) => {
  const oldToken = await _getToken(userId);
  if (oldToken) {
    return false;
  }

  const otp = otpGen.generate(6, {
    upperCase: false,
    specialChars: false,
    alphabets: false,
  });

  // gen verification token and saving that token in db, which will expire in an hour
  const token = new Token({ _userId: userId, token: otp });
  await token.save();
  mailer.pwdReset(otp, email);
  return true;
};

/* Send new OTP for password reset 
    - delete old OTP
*/
module.exports.resendOTPForPasswordReset = async (userId, email) => {
  await _deleteOldToken(userId);
  await this.sendOTPForPasswordReset(userId, email);
};

/* Send account verification token 
    - check if already a token exists
    - creates a new acc verification token
    - saves the document in db
    - send the email with new token as a link
    - return true
*/
module.exports.sendVerificationMail = async (userId, email) => {
  const oldToken = await _getToken(userId);
  if (oldToken) {
    return false;
  }
  // gen verification token and saving that token in db, which will expire in an hour
  const token = new Token({
    _userId: userId,
    token: crypto.randomBytes(64).toString("hex"),
  });

  await token.save();
  mailer.accVerification(token.token, email);
  return true;
};

/* Send new verification email 
    - delete old token
*/
module.exports.sendNewVerificationMail = async (userId, email) => {
  await _deleteOldToken(userId);
  await this.sendVerificationMail(userId, email);
};

/* 
  Fetches a token from db 
*/
async function _getToken(userId) {
  const token = await Token.findOne({ _userId: userId });
  return token;
}

/* 
  Remove an existing token from db 
*/
async function _deleteOldToken(userId) {
  await Token.deleteOne({ _userId: userId });
}

/* Verify users' account
    - fetch verification token from db
    - [ERROR] if not found, send error response
    - delete the token
    - return the token and data, through which the function 
      called this will verify the user
*/
module.exports.verifyUser = async (token) => {
  const verificationToken = await Token.findOne({ token: token });
  if (!verificationToken) return;
  await _deleteOldToken(verificationToken._userId);
  return verificationToken;
};

/* Verify otp
    - fetch verification token from db
    - [ERROR] if not found, send error response
    - delete the token
    - return the token and data, through which the function 
      called this will verify the user
*/
module.exports.verifyOTP = async (otp) => {
  const verificationToken = await Token.findOne({ token: otp });
  if (!verificationToken) return;
  await _deleteOldToken(verificationToken._userId);
  return verificationToken;
};

module.exports.deleteOldToken = _deleteOldToken;
