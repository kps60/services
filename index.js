import e from "express";
import cors from "cors"
import { config } from "dotenv";
import router from "./routes/handler.js";
const app = e()
config()
const port = process.env.PORT || 3000
app.use(cors())
app.use(e.json())
// app.use(e.urlencoded({ extended: true }))
app.use("/replicate-webhook", router)
// app.use(e.static('public'))
app.listen(port, () => {
    console.log(`Server is running on port ${port}`)
})
