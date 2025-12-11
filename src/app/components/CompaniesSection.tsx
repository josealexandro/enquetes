import Image from "next/image";

export default function CompaniesSection() {
  return (
    <section className="bg-gray-100 py-16">
      <div className="container mx-auto px-4 text-center">
        <h2 className="text-3xl font-bold text-gray-800 mb-8">
          Empresas que confiam no PollApp
        </h2>
        <div className="flex flex-wrap justify-center items-center gap-8">
          <div className="bg-white p-4 rounded-lg shadow-md">
            <Image
              src="/logoParceiro4.png"
              alt="Logo Parceira 4"
              width={150}
              height={150}
            />
          </div>
          <div className="bg-white p-4 rounded-lg shadow-md">
            <Image
              src="/logoParceira1.png"
              alt="Logo Parceira 1"
              width={150}
              height={150}
            />
          </div>
          <div className="bg-white p-4 rounded-lg shadow-md">
            <Image
              src="/logoParceira2.png"
              alt="Logo Parceira 2"
              width={150}
              height={150}
            />
          </div>
          <div className="bg-white p-4 rounded-lg shadow-md">
            <Image
              src="/logoParceira3.png"
              alt="Logo Parceira 3"
              width={150}
              height={150}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
