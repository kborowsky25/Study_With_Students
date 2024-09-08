from flask import Flask, redirect, render_template, request, session 
import mysql.connector
from mysql.connector import Error

app = Flask(__name__)

app.config['SECRET_KEY'] = 'your_secret_key_here' #need to see what this is for later

# Set sessions to be permanent (not cleared on browser close)
app.config['SESSION_PERMANENT'] = False  # False means the session lasts as long as the browser is open.

@app.route("/")
def index():
    return render_template("homepage.html")

@app.route("/whatwedo")
def route1():
    return render_template("whatwedo.html")

@app.route("/join")
def route2():
    return render_template("signup.html")

@app.route("/talk")
def route3():
    return render_template("contact.html")


@app.route("/signup", methods=["GET", "POST"])
def signup():
    if request.method == "GET":
        return render_template("signup.html")
    elif request.method == "POST":
        name = request.form["name"]
        email = request.form["email"]
        password = request.form["password"]
        
        try:
            # Connect to the database
            connection = mysql.connector.connect(
                host='localhost',          # e.g., 'localhost' or an IP address
                user='root',      # your database username
                password='Kikidi25',  # your database password
                database='users_tutoring'   # the name of your database
            )
            
            if connection.is_connected():
                cursor = connection.cursor() #create a cursor that can find things in db

                sql_check = "SELECT * FROM users WHERE email = %s"
                cursor.execute(sql_check, (email,)) #find an account with this email address
                result = cursor.fetchone() #fetches first row (should only be one)

                if result: 
                    cursor.close()
                    connection.close()
                    return redirect("/login") #should find a better way to do this !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
            
                else: #doesnt exist
                    sql_insert = "INSERT INTO users (name, email, password) VALUES (%s, %s, %s)"
                    
                    cursor.execute(sql_insert, (name, email, password))
                    connection.commit() #git logic
                    cursor.close()
                    connection.close()
                
                return redirect("/login") #Prevents form resubmission -- goes to next step
        
        except Error as error_message:
            print(f"Error: {error_message}")
            return render_template("/") # Optionally render an error template or redirect to an error page
        
    return redirect("/") #for anything else than get or post -- not sure it happens a lot at all

@app.route("/login", methods=["GET", "POST"])
def login():
    if request.method == "GET":
        return render_template("login.html")

    elif request.method == "POST":
        email = request.form["email"]
        password = request.form["password"]

        if 'user_id' in session and session['email'] != email: #check to see if when submitting the form again  that the credentials match
            session.clear()  # Clears the session to remove previous login details

        try:
            # Connect to the database
            connection = mysql.connector.connect(
                host='localhost',          # e.g., 'localhost' or an IP address
                user='root',      # your database username
                password='Kikidi25',  # your database password
                database='users_tutoring'   # the name of your database
            )
            
            if connection.is_connected():
                cursor = connection.cursor()

                sql = "SELECT * FROM users WHERE email = %s AND password = %s"
                cursor.execute(sql, (email, password))
                
                result = cursor.fetchone() #one row
                
                if result:
                    # Login successful
                    session['user_id'] = result[0]  # store data in session array that you can access anywhere
                    session['name'] = result[1]   
                    session['email'] = result[2]
                    cursor.close()
                    connection.close() 

                    return redirect("/hub")  # Redirect to hub 
                else:
                    # Login failed
                    return render_template("login.html", error=True) #need to find a better way of doing this!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
        
        except Error as error_message:
            print(f"Error: {error_message}")
            return render_template("homepage.html")
        
    return redirect("/") #prob will never be needed


@app.route("/hub")
def hub():
    if 'user_id' in session: #check to see if session is active just in case someone /hubs 
        name = session["name"]

        return render_template("hub.html", name=name) #customize the hub
    else:
        # If user is not logged in, redirect to login page
        return redirect("/login") #facts chatgbt, you tell em gurl
