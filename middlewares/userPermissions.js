const roles = {
   admin: {
      permissions: ['admin', 'chef', 'user']
   },
   chef: {
      permissions: ['chef', 'user']
   },
   user: {
      permissions: ['user']
   }
};

module.exports = { roles };
