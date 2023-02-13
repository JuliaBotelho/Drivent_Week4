import { prisma } from "@/config";
import { createUser } from "./users-factory";

export async function sellOutRoom(roomId: number){
    const firstUser = await createUser();
    const secondUser = await createUser();
    const thirdUser = await createUser();

    return await prisma.booking.createMany({
        data:[
            {
                userId: firstUser.id,
                roomId: roomId
            },
            {
                userId: secondUser.id,
                roomId: roomId
            },
            {
                userId: thirdUser.id,
                roomId: roomId
            }
        ]
    })
}

export async function createNewBooking(roomId: number, userId:number){
    return await prisma.booking.create({
        data:{
            roomId: roomId,
            userId: userId
        }
    })
}

export async function createMockBooking(roomId: number) {
    const user = await createUser();
    return await prisma.booking.create({
        data:{
            roomId: roomId,
            userId: user.id
        }
    })
}