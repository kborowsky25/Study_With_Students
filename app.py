from flask import Flask, redirect, render_template, request

app = Flask(__name__)

@app.route("/")
def index():
    return render_template("homepage.html")

@app.route("/whatwedo")
def route1():
    return render_template("whatwedo.html")


