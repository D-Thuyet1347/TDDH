import React from 'react';

const Testimonials = () => {
  const testimonials = [
    { name: 'Sarah Johnson', type: 'Regular Client', rating: 5, comment: 'The AI consultation was spot on! It recommended the perfect treatment for my skin concerns. Absolutely loved the experience.' },
    { name: 'Michael Chang', type: 'First-time Visitor', rating: 5, comment: 'Booking was incredibly easy and the hot stone massage was life-changing. I’ve already scheduled my next appointment!' },
    { name: 'Emma Rodriguez', type: 'Monthly Member', rating: 5, comment: 'The staff is amazing and the facilities are impeccable. My monthly facials have transformed my skin completely.' },
  ];

  return (
    <section className="p-10">
      <h2 className="text-3xl font-bold text-maincolor text-center">What Our Clients Say</h2>
      <p className="text-gray-600 text-center mt-2">Don’t just take our word for it. Here’s what our satisfied clients have to say about their experience at SerenitySpa.</p>
      <div className="grid grid-cols-3 gap-6 mt-8">
        {testimonials.map((testimonial, index) => (
          <div key={index} className="bg-white p-4 rounded-lg shadow-md">
            <div className="flex items-center space-x-4">
              <img src="https://i.pravatar.cc/150?img=5" alt={testimonial.name} className="w-12 h-12 rounded-full" />
              <div>
                <h3 className="text-lg font-semibold text-maincolor">{testimonial.name}</h3>
                <p className="text-gray-600">{testimonial.type}</p>
              </div>
            </div>
            <div className="flex mt-2">
              {[...Array(testimonial.rating)].map((_, i) => (
                <span key={i} className="material-icons text-yellow-500">star</span>
              ))}
            </div>
            <p className="text-gray-600 mt-2">{testimonial.comment}</p>
          </div>
        ))}
      </div>
    </section>
  );
};

export default Testimonials;