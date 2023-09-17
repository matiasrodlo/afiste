// ============================
//  Puerto
// ============================
process.env.PORT = process.env.PORT || 3000;


// ============================
//  Entorno
// ============================
process.env.NODE_ENV = process.env.NODE_ENV || 'dev';


// ============================
//  Base de datos
// ============================
let urlDB

if (process.env.NODE_ENV == 'dev') {
    urlDB = 'mongodb://localhost:27017/afiste'
} else {
    urlDB = 'mongodb+srv://mmauroperez:Perez123@afistecluster-a8ovj.gcp.mongodb.net/afiste';
}
process.env.URLDB = urlDB;

// mongodb+srv://sochamar:<password>@sochamarmongodb-ubxn7.gcp.mongodb.net/test?retryWrites=true&w=majority
