function EmailForm(){
    return (
        <form className="bg-amber-300 mt-6 w-full p-6">
            <div className="flex flex-col md:flex-row items-center justify-center p-6 md:p-12 bg-blue-500">
                <input
                    type="email"
                    placeholder="Enter your email"
                    className="w-full md:w-1/5 p-3 rounded-xl focus:outline-none bg-red-500"/>
            </div>

        </form>
    )
}

export default EmailForm;