import { collection, addDoc, getDocs, query, where } from "firebase/firestore";
import { db } from "@/firebase";

// 예약 중복 체크
export async function checkReservation(
  date: string,
  time: string,
  bay: number
) {
  const q = query(
    collection(db, "reservations"),
    where("date", "==", date),
    where("time", "==", time),
    where("bay", "==", bay)
  );

  const snapshot = await getDocs(q);
  return !snapshot.empty; // true면 이미 예약 있음
}

// 예약 추가
export async function createReservation(data: {
  userName: string;
  phone: string;
  date: string;
  time: string;
  bay: number;
}) {
  const exists = await checkReservation(data.date, data.time, data.bay);
  if (exists) {
    throw new Error("이미 예약된 시간입니다.");
  }

  await addDoc(collection(db, "reservations"), {
    ...data,
    status: "confirmed",
    createdAt: new Date(),
  });
}
