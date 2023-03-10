const authenticateToken = (req, res, next) => {
   const JWT_SECRET_KEY = process.env.JWT_SECRET_KEY;
   const authHeader = req.headers['authorization'];
   const token = authHeader && authHeader.split(' ')[1];

   if (!token) {
      return res.status(401).json('Access denied');
   }

   jwt.verify(token, JWT_SECRET_KEY, (err, decoded) => {
      if (err) {
         return res.status(403).json('Token is not valid');
      }

      req.userId = decoded.id;
      next();
   });
};
module.exports = authenticateToken;
