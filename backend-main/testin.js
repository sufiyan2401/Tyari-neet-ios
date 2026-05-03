const Razorpay = require("razorpay");

var instance = new Razorpay({ key_id: 'rzp_test_Skbk3DnbPc9I6f', key_secret: 'gEBDSeOy4XtWChejyRy86joc' })

instance.orders.create({
amount: 50000,
currency: "INR",
receipt: "receipt#1",
notes: {
    key1: "value3",
    key2: "value2"
}
})
// rzp_test_Skbk3DnbPc9I6f:gEBDSeOy4XtWChejyRy86joc