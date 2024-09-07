from flask import Flask, redirect, render_template, request
import mysql.connector
from mysql.connector import Error

app = Flask(__name__)

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
                cursor = connection.cursor()

                sql_check = "SELECT * FROM users WHERE email = %s"
                cursor.execute(sql_check, (email,))
                result = cursor.fetchone()

                if result: 
                    print("Error. An account with this email already exists")
                    cursor.close()
                    connection.close()
                    return redirect("/login")
                # SQL statement to insert user data
                else:
                    sql_insert = "INSERT INTO users (name, email, password) VALUES (%s, %s, %s)"
                    
                    cursor.execute(sql_insert, (name, email, password))
                    connection.commit()
                    cursor.close()
                    connection.close()
                
                # Redirect to a success page or home page
                return redirect("/login") #Prevents form resubmission
        
        except Error as error_message:
            print(f"Error: {error_message}")
            # Optionally render an error template or redirect to an error page
            return render_template("/")
        
    return redirect("/")


@app.route("/login", methods=["GET", "POST"])
def login():
    if request.method == "GET":
        return render_template("login.html")
    elif request.method == "POST":
        email = request.form.get["email"]
        password = request.form.get["password"]

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
                # SQL statement to insert user data

                sql = "SELECT * FROM users WHERE email = %s AND password = %s"
                cursor.execute(sql, (email, password))
                
                # Fetch the result
                result = cursor.fetchone()
                
                if result:
                    # Login successful
                    return redirect("/hub")  # Redirect to a dashboard or home page
                else:
                    # Login failed
                    return redirect("/")
        
        except Error as error_message:
            print(f"Error: {error_message}")
            # Optionally render an error template or redirect to an error page
            return render_template("/")
        
    return redirect("/")





        