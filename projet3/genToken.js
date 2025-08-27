const jwt = require('jsonwebtoken');
const SECRET = process.env.JWT_SECRET || 'secret';

function generateToken(userId){
    return jwt.sign({userId}, SECRET, {expiresIn: '12h'})
}

console.log('Token for usser 1 : ', generateToken(1))
console.log('Token for usser 2 : ', generateToken(2))