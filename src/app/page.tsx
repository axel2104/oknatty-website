import Image from 'next/image';
import HeroSlider from '@/components/ui/hero-slider';

export default function Home() {
  const slides = [
    {
      src: '/MOCKUP/CIOCCOLATOFONDENTE.webp',
      alt: 'Cioccolato Fondente',
      title: 'OKNATTY',
      subtitle: 'Il Gusto che Ti Fa Bene',
    },
    {
      src: '/MOCKUP/cremacoccobar.webp',
      alt: 'Cioccolato e Cocco',
      title: 'Cocco',
      subtitle: "L'abbinamento tropicale",
    },
    {
      src: '/MOCKUP/CaramelloSalato.webp',
      alt: 'Caramello Salato',
      title: 'Caramello',
      subtitle: 'Dolce e salato in armonia',
    },
    {
      src: '/MOCKUP/NOCCIOLATABIANCA.webp',
      alt: 'Crema Nocciola Bianca',
      title: 'Nocciola Bianca',
      subtitle: 'Eleganza vellutata',
    },
    {
      src: '/MOCKUP/Nocciola.webp',
      alt: 'Cacao e Nocciola',
      title: 'Cacao e Nocciola',
      subtitle: 'Il matrimonio perfetto',
    },
    {
      src: '/MOCKUP/CIOCCOLATOCOCCO.webp',
      alt: "Burro d'Arachidi",
      title: "Burro d'Arachidi",
      subtitle: 'Il classico americano',
    },
  ];

  return (
    <div className="min-h-screen w-full paper-bg">
      {/* HERO SLIDER */}
      <HeroSlider slides={slides} autoPlayInterval={4000} />

      {/* MISSIONE - subito sotto il banner */}
      <section id="missione" className="py-20 lg:py-32 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-sm font-bold uppercase tracking-widest mb-4" style={{ color: '#8B6914' }}>La Nostra Missione</p>
            <h2 className="text-4xl lg:text-6xl font-bold mb-6" style={{ color: '#3D2618' }}>Gusto Prima Sempre</h2>
            <p className="text-lg max-w-2xl mx-auto" style={{ color: '#5C3D2E' }}>
              Crediamo che mangiare sano non debba significare rinunciare al piacere. OKNATTY e la prova che proteine e gusto possono andare d'accordo.
            </p>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { title: 'Colazione', desc: '21g di proteine per iniziare la giornata con energia' },
              { title: 'Post-Workout', desc: 'Recupero muscolare mai stato cosi goloso' },
              { title: 'Snack', desc: 'Quando la fame colpisce, scegli qualcosa che ti nutre' },
              { title: 'Dolci', desc: 'Ingrediente segreto per pancake e dessert proteici' },
              { title: 'Famiglia', desc: 'Un prodotto che piace a grandi e piccini' },
              { title: 'Fitness', desc: 'Per chi non vuole rinunciare al gusto' },
            ].map((item) => (
              <div key={item.title} className="p-6 rounded-2xl" style={{ background: 'rgba(255, 255, 255, 0.6)', backdropFilter: 'blur(10px)', border: '2px solid #3D2618' }}>
                <h3 className="text-lg font-bold mb-2" style={{ color: '#3D2618' }}>{item.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: '#5C3D2E' }}>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES BAR */}
      <section className="py-8 px-6" style={{ background: '#5C3D2E' }}>
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: '/oil.webp', text: 'Senza Olio di Palma' },
              { icon: '/sugar-cubes.webp', text: 'Basso Zucchero' },
              { icon: '/leaf.webp', text: '100% Naturale' },
              { icon: '/Recycling_symbol.svg', text: 'Eco-Friendly' },
            ].map((item) => (
              <div key={item.text} className="flex items-center gap-3">
                <div className="relative h-8 w-8 flex-shrink-0">
                  <Image src={item.icon} alt="" fill className="object-contain invert" />
                </div>
                <span className="text-sm font-bold" style={{ color: '#F5F0E8' }}>{item.text}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRODOTTI */}
      <section id="prodotti" className="py-20 lg:py-32 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-sm font-bold uppercase tracking-widest mb-4" style={{ color: '#8B6914' }}>La Nostra Linea</p>
            <h2 className="text-4xl lg:text-6xl font-bold mb-6" style={{ color: '#3D2618' }}>6 Gusti Unici</h2>
            <p className="text-lg max-w-2xl mx-auto" style={{ color: '#5C3D2E' }}>
              Ogni vasetto e una esperienza di sapore, con fino al 22% di proteine di alta qualita.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              { name: 'Cioccolato Fondente', img: '/MOCKUP/CIOCCOLATOFONDENTE.webp', protein: '21%', desc: 'Il classico intramontabile' },
              { name: 'Cioccolato e Cocco', img: '/MOCKUP/cremacoccobar.webp', protein: '21%', desc: "L'abbinamento tropicale" },
              { name: 'Caramello Salato', img: '/MOCKUP/CaramelloSalato.webp', protein: '21%', desc: 'Dolce e salato in armonia' },
              { name: 'Crema Nocciola Bianca', img: '/MOCKUP/NOCCIOLATABIANCA.webp', protein: '21%', desc: 'Eleganza vellutata' },
              { name: 'Cacao e Nocciola', img: '/MOCKUP/Nocciola.webp', protein: '22%', desc: 'Il matrimonio perfetto' },
              { name: "Burro d'Arachidi", img: '/MOCKUP/CIOCCOLATOCOCCO.webp', protein: '22%', desc: 'Il classico americano' },
            ].map((product) => (
              <div key={product.name} className="group rounded-3xl overflow-hidden hover:shadow-xl transition-all duration-300" style={{ background: 'rgba(255, 255, 255, 0.7)', backdropFilter: 'blur(10px)', border: '2px solid #3D2618' }}>
                <div className="relative aspect-[4/3] overflow-hidden">
                  <Image src={product.img} alt={product.name} fill className="object-cover group-hover:scale-105 transition-transform duration-300" />
                </div>
                <div className="p-6">
                  <div className="flex items-center justify-between mb-3">
                    <span className="inline-block px-3 py-1 rounded-full text-xs font-bold" style={{ background: '#5C3D2E', color: '#F5F0E8' }}>
                      {product.protein} Proteine
                    </span>
                  </div>
                  <h3 className="text-xl font-bold mb-1" style={{ color: '#3D2618' }}>{product.name}</h3>
                  <p className="text-sm" style={{ color: '#5C3D2E' }}>{product.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PERCHE SCEGLIERCI */}
      <section id="perche" className="py-20 lg:py-32 px-6" style={{ background: 'rgba(92, 61, 46, 0.08)' }}>
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="relative aspect-[4/3] rounded-3xl overflow-hidden shadow-lg" style={{ border: '3px solid #3D2618' }}>
              <Image src="/Gemini_Generated_Image_6ut5ym6ut5ym6ut5.webp" alt="OKNATTY" fill className="object-cover" />
            </div>
            <div>
              <p className="text-sm font-bold uppercase tracking-widest mb-4" style={{ color: '#8B6914' }}>Perche OKNATTY</p>
              <h2 className="text-4xl lg:text-5xl font-bold mb-6" style={{ color: '#3D2618' }}>Solo Cose Buone</h2>
              <p className="text-lg mb-10 leading-relaxed" style={{ color: '#5C3D2E' }}>
                OKNATTY nasce dalla passione per il gusto e dall'impegno per la salute. Ogni vasetto contiene fino al 22% di proteine di alta qualita, perfette per chi si allena e per chi semplicemente vuole mangiare meglio.
              </p>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { icon: '/oil.webp', text: 'Senza Olio di Palma' },
                  { icon: '/sugar-cubes.webp', text: 'Basso Zucchero' },
                  { icon: '/leaf.webp', text: '100% Naturale' },
                  { icon: '/Recycling_symbol.svg', text: 'Eco-Friendly' },
                ].map((item) => (
                  <div key={item.text} className="flex items-center gap-3 p-4 rounded-2xl" style={{ background: 'rgba(245, 240, 232, 0.8)', backdropFilter: 'blur(10px)', border: '2px solid #3D2618' }}>
                    <div className="relative h-8 w-8 flex-shrink-0">
                      <Image src={item.icon} alt="" fill className="object-contain" />
                    </div>
                    <span className="text-sm font-bold" style={{ color: '#3D2618' }}>{item.text}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section id="ordina" className="py-20 lg:py-32 px-6" style={{ background: '#5C3D2E' }}>
        <div className="max-w-4xl mx-auto text-center">
          <div className="relative h-48 w-48 mx-auto mb-8 rounded-3xl overflow-hidden shadow-lg" style={{ border: '4px solid #F5F0E8' }}>
            <Image src="/MOCKUP/CIOCCOLATOFONDENTE.webp" alt="OKNATTY" fill className="object-cover" />
          </div>
          <h2 className="text-4xl lg:text-6xl font-bold mb-6" style={{ color: '#F5F0E8' }}>Pronto a Gustare?</h2>
          <p className="text-lg mb-10 max-w-xl mx-auto" style={{ color: '#E8D5B5' }}>
            Ordina ora le tue creme OKNATTY e scopri perche migliaia di persone hanno gia scelto il gusto che fa bene.
          </p>
          <a href="mailto:info@oknatty.com" className="inline-block px-10 py-4 rounded-full text-lg font-bold hover:opacity-90 transition-opacity" style={{ background: '#F5F0E8', color: '#3D2618' }}>
            Ordina Ora
          </a>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-12 px-6" style={{ background: '#3D2618' }}>
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-8">
            <div className="flex items-center gap-3">
              <div className="relative h-10 w-10">
                <Image src="/logo.webp" alt="OKNATTY" fill className="object-contain" />
              </div>
              <span className="text-xl font-bold" style={{ color: '#F5F0E8' }}>OKNATTY</span>
            </div>
            <div className="flex gap-8">
              <a href="#" className="text-sm font-medium hover:opacity-70 transition-opacity" style={{ color: '#E8D5B5' }}>Instagram</a>
              <a href="#" className="text-sm font-medium hover:opacity-70 transition-opacity" style={{ color: '#E8D5B5' }}>Facebook</a>
              <a href="#" className="text-sm font-medium hover:opacity-70 transition-opacity" style={{ color: '#E8D5B5' }}>TikTok</a>
            </div>
          </div>
          <div className="mt-8 pt-8 text-center" style={{ borderTop: '1px solid rgba(245, 240, 232, 0.15)' }}>
            <p className="text-sm" style={{ color: '#E8D5B5', opacity: 0.7 }}>2025 OKNATTY. Tutti i diritti riservati.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
