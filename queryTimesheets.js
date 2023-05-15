const mongoose = require('mongoose');
const Timesheet = require('./models/Timesheet');

const connectionString = 'mongodb+srv://nallabalacharan:Galway10.@cluster0.h2igzg0.mongodb.net/Database0?retryWrites=true&w=majority';

async function main() {
  try {
    await mongoose.connect(connectionString, { useNewUrlParser: true, useUnifiedTopology: true });
  } catch (err) {
    console.error('Error connecting to MongoDB:', err);
    process.exit(1);
  }

  try {
    const timesheets = await Timesheet.find({});
    console.log('Timesheets:', timesheets);
  } catch (err) {
    console.error('Error fetching timesheets:', err);
  } finally {
    mongoose.connection.close();
  }
}

main();
