import { SelectToolComponent } from "../components/SelectToolComponent";


export default function Home() {
  return (
    <div className="bg-primary-black pt-2 flex justify-center flex-col text-white pb-10">
      <main className="flex flex-col justify-center items-center mx-4 md:mx-40 rounded-lg">
        <SelectToolComponent />
      </main>
    </div>
  );
}
