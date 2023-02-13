import { prisma } from "@/config";

async function newBooking(roomId: number, userId: number) {
    return prisma.booking.create({
        data:{
            roomId: roomId,
            userId: userId
        }
    })
}

async function roomCapacity(roomId:number) {
    return prisma.room.findFirst({
        where:{
            id: roomId,
        }
    })
}

async function roomAvailability(roomId:number) {
    return prisma.booking.findMany({
        where:{
            roomId: roomId,
        }
    })
}

async function findBooking(userId: number) {
    return prisma.booking.findFirst({
        where:{
            userId: userId,
        },
        include: {
            Room:true
        }
    })    
}

async function getBookingId(bookingId:number) {
    return prisma.booking.findFirst({
        where:{
            id: Number(bookingId)
        }
    })
}


async function redoBooking(roomId:number, bookingId: number) {
    return prisma.booking.update({
        where: {
            id: bookingId,
          },
          data: {
            roomId: roomId,
          },
    })
}

const bookingRepository = {
    newBooking,
    findBooking,
    redoBooking,
    roomAvailability,
    roomCapacity,
    getBookingId
};

export default bookingRepository;