import app, { init } from "@/app";
import { prisma } from "@/config";
import faker from "@faker-js/faker";
import { TicketStatus } from "@prisma/client";
import httpStatus from "http-status";
import * as jwt from "jsonwebtoken";
import supertest from "supertest";
import {
    createEnrollmentWithAddress,
    createUser,
    createTicketType,
    createTicket,
    createPayment,
    generateCreditCardData,
    createTicketTypeWithHotel,
    createTicketTypeRemote,
    createTicketTypeWithoutHotel,
    createHotel,
    createRoomWithHotelId,
    sellOutRoom,
    createNewBooking,
    createMockBooking
} from "../factories";
import { cleanDb, generateValidToken } from "../helpers";

beforeAll(async () => {
    await init();
});

beforeEach(async () => {
    await cleanDb();
});

const server = supertest(app);

describe("POST /booking", () => {
    it("should respond with status 401 if no token is given", async () => {
        const response = await server.post("/booking");

        expect(response.status).toBe(httpStatus.UNAUTHORIZED);
    });

    it("should respond with status 401 if given token is not valid", async () => {
        const token = faker.lorem.word();

        const response = await server.post("/booking").set("Authorization", `Bearer ${token}`);

        expect(response.status).toBe(httpStatus.UNAUTHORIZED);
    });

    it("should respond with status 401 if there is no session for given token", async () => {
        const userWithoutSession = await createUser();
        const token = jwt.sign({ userId: userWithoutSession.id }, process.env.JWT_SECRET);

        const response = await server.post("/booking").set("Authorization", `Bearer ${token}`);

        expect(response.status).toBe(httpStatus.UNAUTHORIZED);
    });

    it("should respond with status httpStatus- BadRequest if roomId is not provided", async () => {
        const user = await createUser();
        const token = await generateValidToken(user);

        const response = await (await server.post("/booking").set("Authorization", `Bearer ${token}`).send({}));

        expect(response.status).toBe(httpStatus.BAD_REQUEST);
    })

    it("should respond with status 403 if user has no enrollment", async () => {
        const user = await createUser();
        const token = await generateValidToken(user);

        const createdHotel = await createHotel();

        const createdRoom = await createRoomWithHotelId(createdHotel.id);

        const response = await (await server.post("/booking").set("Authorization", `Bearer ${token}`).send({ roomId: createdRoom.id }));

        expect(response.status).toBe(httpStatus.FORBIDDEN);
    })

    it("should respond with status 403 if user has no ticket", async () => {
        const user = await createUser();
        const token = await generateValidToken(user);
        const enrollment = await createEnrollmentWithAddress(user);

        const createdHotel = await createHotel();

        const createdRoom = await createRoomWithHotelId(createdHotel.id);

        const response = await (await server.post("/booking").set("Authorization", `Bearer ${token}`).send({ roomId: createdRoom.id }));

        expect(response.status).toBe(httpStatus.FORBIDDEN);
    });

    it("should respond with status 403 if user's ticket is remote", async () => {
        const user = await createUser();
        const token = await generateValidToken(user);
        const enrollment = await createEnrollmentWithAddress(user);
        const ticketType = await createTicketTypeRemote();
        const ticket = await createTicket(enrollment.id, ticketType.id, TicketStatus.PAID);

        const createdHotel = await createHotel();

        const createdRoom = await createRoomWithHotelId(createdHotel.id);

        const response = await (await server.post("/booking").set("Authorization", `Bearer ${token}`).send({ roomId: createdRoom.id }));

        expect(response.status).toBe(httpStatus.FORBIDDEN);
    });

    it("should respond with status 403 if user's ticket does not include Hotel", async () => {
        const user = await createUser();
        const token = await generateValidToken(user);
        const enrollment = await createEnrollmentWithAddress(user);
        const ticketType = await createTicketTypeWithoutHotel();
        const ticket = await createTicket(enrollment.id, ticketType.id, TicketStatus.PAID);

        const createdHotel = await createHotel();

        const createdRoom = await createRoomWithHotelId(createdHotel.id);

        const response = await (await server.post("/booking").set("Authorization", `Bearer ${token}`).send({ roomId: createdRoom.id }));

        expect(response.status).toBe(httpStatus.FORBIDDEN);
    });

    it("should respond with status 403 if the room is completely full", async () => {
        const user = await createUser();
        const token = await generateValidToken(user);
        const enrollment = await createEnrollmentWithAddress(user);
        const ticketType = await createTicketTypeWithHotel();
        const ticket = await createTicket(enrollment.id, ticketType.id, TicketStatus.PAID);
        const payment = await createPayment(ticket.id, ticketType.price);

        const createdHotel = await createHotel();

        const createdRoom = await createRoomWithHotelId(createdHotel.id);

        const soldOutRoom = await sellOutRoom(createdRoom.id)

        const response = await (await server.post("/booking").set("Authorization", `Bearer ${token}`).send({ roomId: createdRoom.id }));

        expect(response.status).toBe(httpStatus.FORBIDDEN);
    })

    it("should respond with status 404 if provided roomId does not exist", async () => {
        const user = await createUser();
        const token = await generateValidToken(user);
        const enrollment = await createEnrollmentWithAddress(user);
        const ticketType = await createTicketTypeWithHotel();
        const ticket = await createTicket(enrollment.id, ticketType.id, TicketStatus.PAID);
        const payment = await createPayment(ticket.id, ticketType.price);

        const createdHotel = await createHotel();

        const createdRoom = await createRoomWithHotelId(createdHotel.id);

        const response = await (await server.post("/booking").set("Authorization", `Bearer ${token}`).send({ roomId: 999999 }));
        expect(response.status).toEqual(httpStatus.NOT_FOUND);
    })

    it("should create a reservation if all business conditions are fullfilled and respond with status code 200", async () => {
        const user = await createUser();
        const token = await generateValidToken(user);
        const enrollment = await createEnrollmentWithAddress(user);
        const ticketType = await createTicketTypeWithHotel();
        const ticket = await createTicket(enrollment.id, ticketType.id, TicketStatus.PAID);
        const payment = await createPayment(ticket.id, ticketType.price);

        const createdHotel = await createHotel();

        const createdRoom = await createRoomWithHotelId(createdHotel.id);

        const response = await (await server.post("/booking").set("Authorization", `Bearer ${token}`).send({ roomId: createdRoom.id }));
        expect(response.status).toEqual(httpStatus.OK);
        expect(response.body).toEqual({ bookingId: expect.any(Number) })
    })
})

describe("GET /booking", () => {
    it("should respond with status 401 if no token is given", async () => {
        const response = await server.get("/booking");

        expect(response.status).toBe(httpStatus.UNAUTHORIZED);
    });

    it("should respond with status 401 if given token is not valid", async () => {
        const token = faker.lorem.word();

        const response = await server.get("/booking").set("Authorization", `Bearer ${token}`);

        expect(response.status).toBe(httpStatus.UNAUTHORIZED);
    });

    it("should respond with status 401 if there is no session for given token", async () => {
        const userWithoutSession = await createUser();
        const token = jwt.sign({ userId: userWithoutSession.id }, process.env.JWT_SECRET);

        const response = await server.get("/booking").set("Authorization", `Bearer ${token}`);

        expect(response.status).toBe(httpStatus.UNAUTHORIZED);
    });

    it("should respond with status 404 if user does not have a booking registered", async () => {
        const user = await createUser();
        const token = await generateValidToken(user);
        const enrollment = await createEnrollmentWithAddress(user);
        const ticketType = await createTicketTypeWithHotel();
        const ticket = await createTicket(enrollment.id, ticketType.id, TicketStatus.PAID);
        const payment = await createPayment(ticket.id, ticketType.price);

        const createdHotel = await createHotel();
        const createdRoom = await createRoomWithHotelId(createdHotel.id);

        const response = await server.get("/booking").set("Authorization", `Bearer ${token}`);
    });

    it("should respond with status 200 and the user's booking", async () => {
        const user = await createUser();
        const token = await generateValidToken(user);
        const enrollment = await createEnrollmentWithAddress(user);
        const ticketType = await createTicketTypeWithHotel();
        const ticket = await createTicket(enrollment.id, ticketType.id, TicketStatus.PAID);
        const payment = await createPayment(ticket.id, ticketType.price);

        const createdHotel = await createHotel();
        const createdRoom = await createRoomWithHotelId(createdHotel.id);

        const newBooking = await createNewBooking(createdRoom.id, user.id);

        const response = await server.get("/booking").set("Authorization", `Bearer ${token}`);
        expect(response.status).toEqual(httpStatus.OK);
        expect(response.body).toEqual({
            id: newBooking.id,
            Room: {
                id: createdRoom.id,
                name: createdRoom.name,
                capacity: createdRoom.capacity,
                hotelId: createdRoom.hotelId,
                createdAt: createdRoom.createdAt.toISOString(),
                updatedAt: createdRoom.updatedAt.toISOString(),
            }
        })
    })
});

describe("PUT /booking/:bookingId", () => {
    it("should respond with status 401 if no token is given", async () => {
        const response = await server.get("/booking/1");

        expect(response.status).toBe(httpStatus.UNAUTHORIZED);
    });

    it("should respond with status 401 if given token is not valid", async () => {
        const token = faker.lorem.word();

        const response = await server.put("/booking/1").set("Authorization", `Bearer ${token}`);

        expect(response.status).toBe(httpStatus.UNAUTHORIZED);
    });

    it("should respond with status 401 if there is no session for given token", async () => {
        const userWithoutSession = await createUser();
        const token = jwt.sign({ userId: userWithoutSession.id }, process.env.JWT_SECRET);

        const response = await server.put("/booking/1").set("Authorization", `Bearer ${token}`);

        expect(response.status).toBe(httpStatus.UNAUTHORIZED);
    });

    it("should respond with status 403 if the user does not have a booking", async () => {
        const user = await createUser();
        const token = await generateValidToken(user);

        const createdHotel = await createHotel();
        const createdRoom = await createRoomWithHotelId(createdHotel.id);
        const mockBooking = await createMockBooking(createdRoom.id);

        const newRoom = await createRoomWithHotelId(createdHotel.id);

        const response = await server.put(`/booking/${mockBooking.id}`).set("Authorization", `Bearer ${token}`).send({ roomId: newRoom.id });

        expect(response.status).toBe(httpStatus.FORBIDDEN);
    });

    it("should respond with status 403 if the user does not have that booking", async () => {
        const user = await createUser();
        const token = await generateValidToken(user);

        const createdHotel = await createHotel();
        const createdRoom = await createRoomWithHotelId(createdHotel.id);
        const userBooking = await createNewBooking(createdRoom.id, user.id);
        const mockBooking = await createMockBooking(createdRoom.id);

        const newRoom = await createRoomWithHotelId(createdHotel.id);

        const response = await server.put(`/booking/${mockBooking.id}`).set("Authorization", `Bearer ${token}`).send({ roomId: newRoom.id });

        expect(response.status).toBe(httpStatus.FORBIDDEN);
    });

    it("should respond with status 404 if provided roomId does not exist",async () => {
        const user = await createUser();
        const token = await generateValidToken(user);
        const createdHotel = await createHotel();
        const createdRoom = await createRoomWithHotelId(createdHotel.id);
        const userBooking = await createNewBooking(createdRoom.id, user.id);

        const newHotel = await createHotel();
        const newRoom = await createRoomWithHotelId(newHotel.id);
        const response = await server.put(`/booking/${userBooking.id}`).set("Authorization", `Bearer ${token}`).send({ roomId: newRoom.id + 10});
        expect(response.status).toEqual(httpStatus.NOT_FOUND);
    });

    it("should respond with status 403 if the room is completely full", async () =>{
        const user = await createUser();
        const token = await generateValidToken(user);
        const createdHotel = await createHotel();
        const createdRoom = await createRoomWithHotelId(createdHotel.id);
        const userBooking = await createNewBooking(createdRoom.id, user.id);

        const newHotel = await createHotel();
        const newRoom = await createRoomWithHotelId(newHotel.id);
        const soldOutRoom = await sellOutRoom(newRoom.id);

        const response = await server.put(`/booking/${userBooking.id}`).set("Authorization", `Bearer ${token}`).send({ roomId: newRoom.id });

        expect(response.status).toEqual(httpStatus.FORBIDDEN);
    });

    it("should respond with status 200 and bookingId if the update is successful", async () =>{
        const user = await createUser();
        const token = await generateValidToken(user);
        const createdHotel = await createHotel();
        const createdRoom = await createRoomWithHotelId(createdHotel.id);
        const userBooking = await createNewBooking(createdRoom.id, user.id);

        const newHotel = await createHotel();
        const newRoom = await createRoomWithHotelId(newHotel.id)

        const response = await server.put(`/booking/${userBooking.id}`).set("Authorization", `Bearer ${token}`).send({ roomId: newRoom.id });

        expect(response.status).toEqual(httpStatus.OK);
        expect(response.body).toEqual({bookingId: expect.any(Number)});
    });
})
