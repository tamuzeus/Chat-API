import express from 'express'
import cors from 'cors'
import dayjs from 'dayjs'
import { MongoClient } from 'mongodb'
import dotenv from 'dotenv'
import joi from 'joi'

dotenv.config()

const app = express()
app.use(express.json())
app.use(cors())
const mongoClient = new MongoClient(process.env.MONGO_URI)

let db;
mongoClient.connect().then(() => {
    db = mongoClient.db('batepapouol')
})

const participantSchema = joi.object({
    name: joi.string().empty(' ').required()
})

const repeat = async (name) => {
    const findName = await db.collection('participants').findOne({ name })
    return findName
}

//POST - Participants
app.post('/participants', async (req, res) => {

    const { name } = req.body

    const validation = participantSchema.validate({ name })

    if (validation.error) {
        res.status(422).send(validation.error.details[0].message)
        return
    };

    try {

        if (await repeat(name)) {
            res.sendStatus(409)
            return
        }

        await db.collection('participants').insertOne({
            name,
            lastStatus: Date.now()
        })

        await db.collection('messages').insertOne({
            from: name,
            to: 'Todos',
            text: 'entra na sala...',
            type: 'status',
            time: dayjs().format('HH:mm:ss')
        })
        res.sendStatus(201)

    } catch (error) {
        console.log(error)
        res.sendStatus(500)
    }

})

//GET - Participants
app.get('/participants', async (req, res) => {

    try {
        const getParticipants = await db.collection('participants').find({}).toArray()
        res.send(getParticipants)
    } catch (error) {
        console.log(error)
        res.sendStatus(500)
    }

})

const messageSchema = joi.object({
    to: joi.string().empty(' ').required(),
    text: joi.string().empty(' ').required(),
    type: joi.valid('message', 'private_message').required()
})

//POST - Messages
app.post('/messages', async (req, res) => {
    const { to: to, text: text, type: type } = req.body;
    const user = req.headers.user;

    const validation = messageSchema.validate({ to, text, type },);

    if (validation.error) {
        res.status(422).send(validation.error.details[0].message)
        return
    }

    try {
        await db.collection('messages').insertOne({
            from: user,
            to: to,
            text: text,
            type: type,
            time: dayjs().format('HH:mm:ss')
        });
        return res.sendStatus(201);
    } catch (error) {
        console.log(error)
        res.sendStatus(500)
    }
})

//GET - Messages

app.get('/messages', async (req, res) => {
    const user = req.headers.user;
    const limit = parseInt(req.query.limit);

    try {
        const getMessages = await db.collection('messages').find().toArray();
        const controlMsg = getMessages.filter((message) => message.type === 'message' || message.to === user || message.from === user)
        if (limit === false) {
            res.send(controlMsg)
        } else {
            const limitedMsg = controlMsg.slice(-limit)
            res.send(limitedMsg)
        }
    } catch (error) {
        console.log(error)
        res.sendStatus(500)
    }
})

//POST - Server

app.post('/status', async (req, res) => {
    const user = req.headers.user;

    try {
        const finder = await db.collection('participants').findOne({ 'name': user })
        if (finder === null) {
            return res.sendStatus(404);
        } else {
            await db.collection('participants').updateOne(
                { 'name': user },
                { $set: { lastStatus: Date.now() } })
            return res.sendStatus(200)
        }
    } catch (error) {
        return res.sendStatus(500)
    }
})

//Remove inatives

// function RemoveInative() {
    
// }

// RemoveInative()

app.listen(5000, () => console.log('Ok, route 5000!'))