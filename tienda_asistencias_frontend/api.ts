import axios from "axios";
const api = axios.create({ 

  baseURL: "http://192.168.10.105:5000/api", 

  timeout: 5000 
});
export default api;