import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyDKfwfH3yElsp56QHUbQvU8-EXYuYrdf7s",
  authDomain: "alinosi-vendas.firebaseapp.com",
  databaseURL: "https://alinosi-vendas-default-rtdb.firebaseio.com",
  projectId: "alinosi-vendas",
  storageBucket: "alinosi-vendas.firebasestorage.app",
  messagingSenderId: "553156453984",
  appId: "1:553156453984:web:3928227d2cfece43e88505",
};

const firebaseApp = initializeApp(firebaseConfig);
export const db = getDatabase(firebaseApp);
