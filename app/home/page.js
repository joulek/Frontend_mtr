import Image from "next/image";

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100">
      <h1 className="text-4xl font-bold text-[#002147]">
        Bienvenue sur la page d'accueil
      </h1>

      <p className="mt-4 text-lg text-gray-600">
        Vous êtes connecté avec succès !
      </p>

      {/* Image */}
      <div className="mt-6">
        <Image
          src="/ChatGPT.png" // chemin relatif depuis /public
          alt="Bienvenue"
          width={300}
          height={300}
          className="rounded-lg shadow-lg"
          priority
        />
      </div>
    </div>
  );
}
