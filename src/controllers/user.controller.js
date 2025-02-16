import {asyncHandler} from '../utils/asyncHandler.js';
import {ApiError} from '../utils/ApiError.js';
import {User} from '../models/user.model.js';
import {uploadOnCloudinary} from '../utils/cloudinary.js';
import{ApiResponse} from '../utils/ApiResponse.js';
const registerUser=asyncHandler(async (req,res)=>{
    //res.status(200).json({
        //message: "ok"
        const {fullname,email,username,password}=req.body
        console.log("Email ",email);

        if(fullname===""){
            throw new ApiError(400,"Fullname is required")
        }

        if([fullname,email,username,password].some((field)=>field?.trim()==="")){
            throw new ApiError(400,"All fields are required")
        }

        const existedError=User.findOne({
            $or:[{email},{username}]
        })
        if(existedError){
            throw new ApiError(409,"Email or username already exists")
        }


        const avatarLocalPath=req.files?.avatar[0]?.path;
        const coverImageLocalPath=req.files?.coverImage[0]?.path;

        if(!avatarLocalPath){
            throw new ApiError(400,"Avatar is required")
        }

        const avatar=await uploadOnCloudinary(avatarLocalPath)
        const coverImage=await uploadOnCloudinary(coverImageLocalPath)

        if(!avatar)
        {
            throw new ApiError(400,"Avatar is required")
        }

        const user=await User.create({
            fullname,
            avatar:avatar.url,
            coverImage:coverImage?.url || "", //if coverImage is not uploaded then set it to empty string
            email,
            password,
            username: username.toLowerCase()

        })

        const createdUser= User.findById(user._id).select("-password -refreshToken")

        if(!createdUser){
            throw new ApiError(500,"User could not be registered")
        }

        return res.status(201).json(
            new ApiResponse(200,createdUser,"User registered successfully")
        )
    })
//})

export {registerUser}