import bookingRepository from "@/repositories/booking-repository";
import enrollmentRepository from "@/repositories/enrollment-repository";
import ticketRepository from "@/repositories/ticket-repository";
import { notFoundError } from "@/errors";

async function inputBooking(roomId: number, userId: number) {
    const enrollment = await enrollmentRepository.findWithAddressByUserId(userId);
    if (!enrollment) {
        throw { message: "Enrollment is needed" };
    }

    const ticket = await ticketRepository.findTicketByEnrollmentId(enrollment.id);

    if (!ticket || ticket.status === "RESERVED" || ticket.TicketType.isRemote || !ticket.TicketType.includesHotel) {
        throw { message: "Ticket Error" };
    }

    const availability = await bookingRepository.roomAvailability(roomId);
    const room = await bookingRepository.roomCapacity(roomId);
    if(!room){
        throw notFoundError();
    }

    if (Number(availability.length) >= Number(room.capacity)) {
        throw { message: "Room is currently unavailable" }
    }

    const booking = await bookingRepository.newBooking(roomId, userId)

    return booking
}

async function fetchBooking(userId: number) {
    const booking = await bookingRepository.findBooking(userId)
    
    if (!booking) {
        throw notFoundError();
    }  

    const bookingObj ={
        id: booking.id,
        Room: booking.Room
    }

    return bookingObj;

}

async function updateBooking(roomId: number, userId: number, bookingId: number) {
    const bookingByUserId = await bookingRepository.findBooking(userId)
    if(!bookingByUserId){
        throw { message: "No reservation by this user was found" };
    }
    const booking = await bookingRepository.getBookingId(bookingId)
    if (booking.userId !== userId) {
        throw { message: "No reservation by this user was found" };
    }

    const room = await bookingRepository.roomCapacity(roomId);
    if(!room){
        throw notFoundError();
    }
    const availability = await bookingRepository.roomAvailability(roomId);
    if (Number(availability.length) >= Number(room.capacity)) {
        throw { message: "Room is currently unavailable" }
    }

    const update = await bookingRepository.redoBooking(roomId, bookingId)

    return update.id;
}

const bookingService = {
    inputBooking,
    fetchBooking,
    updateBooking
};

export default bookingService;