const generateEmailTemplate = (username, confirmationLink) => {
   return `

   <div style="font-family: Arial, sans-serif; font-size: 14px; line-height: 1.5; color: #333; background-color: #ebe2c8ff; padding: 20px;" class="email-container">
   <div style="background-color: #dd9b75ff; color: #fff; padding: 10px; text-align: center;" class="email-header">
      <h3>Welcome to Delicious Recipes!</h3>
   </div>
   <div style="padding: 20px;" class="email-body">
      <p>Dear ${username},</p>
      <p>
         Thank you for registering with Delicious Recipes. Please click   <p> <a href="${confirmationLink}" style="display:inline-block;padding:8px 16px;font-size:14px;font-weight:500;text-align:center;text-decoration:none;color:#fff;background-color:#dd9b75ff;border-radius:4px;transition:background-color 0.2s;width:100%;max-width:240px;margin:12px auto;">Confirm Your Account button</a></p>
         to confirm your account and get started.
      </p>
      <p>It the button is not working please click on the link below</p>
      <p><a href="${confirmationLink}">${confirmationLink}</a></p>
      <p>
         If you did not register for an account with Delicious Recipes,
         please ignore this email.
      </p>
   </div>
   <div style="background-color: #dd9b75ff; color: #fff; padding: 10px; text-align: center;" class="email-footer">
      <p>Thank you,</p>
      <p>Delicious Recipes Team</p>
   </div>
</div>

<style>
  @media (max-width: 600px) {
    div {
      max-width: 100%;
      padding: 0 10px;
    }
    a {
      font-size: 14px;
      padding: 10px 16px;
    }
  }
</style>

    `;
};

module.exports = generateEmailTemplate;
