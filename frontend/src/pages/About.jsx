const About = () => {
  return (
    <div className="bg-white py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center">
          <h2 className="text-base text-orange-600 font-semibold tracking-wide uppercase">About Us</h2>
          <p className="mt-1 text-4xl font-extrabold text-gray-900 sm:text-5xl sm:tracking-tight lg:text-6xl">
            Our Restaurant Story
          </p>
          <p className="max-w-xl mt-5 mx-auto text-xl text-gray-500">
            We started with a simple mission: to bring high-quality, delicious food to everyone. 
            Our passionate team works day and night to ensure the best culinary experience.
          </p>
        </div>

        <div className="mt-20">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
            <div>
              <h3 className="text-3xl font-extrabold text-gray-900">Why Choose Us?</h3>
              <p className="mt-4 text-lg text-gray-500">
                From fresh ingredients to fast delivery, we prioritize quality in everything we do. 
                Our platform uses advanced analytics to understand what our customers love and continuously improve our menu.
              </p>
              <ul className="mt-8 space-y-4">
                <li className="flex items-center text-gray-700">
                  <span className="bg-orange-100 text-orange-600 p-1 rounded-full mr-3">✓</span>
                  Fresh and organic ingredients
                </li>
                <li className="flex items-center text-gray-700">
                  <span className="bg-orange-100 text-orange-600 p-1 rounded-full mr-3">✓</span>
                  Fast and reliable delivery
                </li>
                <li className="flex items-center text-gray-700">
                  <span className="bg-orange-100 text-orange-600 p-1 rounded-full mr-3">✓</span>
                  Award-winning chefs
                </li>
              </ul>
            </div>
            <div className="bg-gray-100 h-96 rounded-2xl flex items-center justify-center shadow-inner">
               <span className="text-gray-400 font-medium">Gallery Image Placeholder</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default About;
